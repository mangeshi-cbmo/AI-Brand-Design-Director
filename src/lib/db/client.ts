import mongoose from "mongoose";
import { promises as dns } from "dns";

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";
const MONGODB_DB = process.env.MONGODB_DB || "agent_brand_db";

// This network's system resolver refuses direct SRV/TXT queries from Node's
// c-ares resolver (querySrv ECONNREFUSED), and the global dns.setServers()
// workaround silently fails whenever a query is already in flight. Instead we
// resolve the Atlas SRV/TXT records ourselves — dedicated public-DNS resolver
// instances first, DNS-over-HTTPS as a last resort — and hand the driver a
// standard mongodb:// seed-list URI so it never issues an SRV lookup at all.
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1", "8.8.4.4"];
const DOH_ENDPOINTS: { url: string; headers: Record<string, string> }[] = [
  { url: "https://dns.google/resolve", headers: {} },
  { url: "https://cloudflare-dns.com/dns-query", headers: { accept: "application/dns-json" } },
];

interface SrvTarget {
  name: string;
  port: number;
}

interface DohAnswer {
  type: number;
  data: string;
}

async function queryDoh(hostname: string, type: "SRV" | "TXT"): Promise<DohAnswer[]> {
  for (const endpoint of DOH_ENDPOINTS) {
    try {
      const res = await fetch(
        `${endpoint.url}?name=${encodeURIComponent(hostname)}&type=${type}`,
        { headers: endpoint.headers, signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) continue;
      const json = (await res.json()) as { Answer?: DohAnswer[] };
      if (json.Answer?.length) return json.Answer;
    } catch {
      // Try the next DoH endpoint
    }
  }
  return [];
}

async function resolveSrvRecords(hostname: string): Promise<SrvTarget[]> {
  try {
    const records = await dns.resolveSrv(hostname);
    if (records.length) return records;
  } catch {
    // System resolver refused the SRV query — fall through
  }

  for (const server of PUBLIC_DNS_SERVERS) {
    try {
      const resolver = new dns.Resolver({ timeout: 3000, tries: 1 });
      resolver.setServers([server]);
      const records = await resolver.resolveSrv(hostname);
      if (records.length) return records;
    } catch {
      // This DNS server unreachable — try the next
    }
  }

  const answers = await queryDoh(hostname, "SRV");
  const targets = answers
    .filter((a) => a.type === 33)
    .map((a) => {
      // SRV data format: "<priority> <weight> <port> <target>"
      const [, , port, name] = a.data.trim().split(/\s+/);
      return { name: name.replace(/\.$/, ""), port: Number(port) };
    })
    .filter((t) => t.name && Number.isFinite(t.port));
  if (targets.length) return targets;

  throw new Error(
    `Unable to resolve SRV records for ${hostname} via system DNS, public DNS, or DNS-over-HTTPS`
  );
}

async function resolveTxtOptions(hostname: string): Promise<string> {
  try {
    const records = await dns.resolveTxt(hostname);
    if (records.length) return records[0].join("");
  } catch {
    // Fall through
  }

  for (const server of PUBLIC_DNS_SERVERS) {
    try {
      const resolver = new dns.Resolver({ timeout: 3000, tries: 1 });
      resolver.setServers([server]);
      const records = await resolver.resolveTxt(hostname);
      if (records.length) return records[0].join("");
    } catch {
      // Try the next
    }
  }

  const answers = await queryDoh(hostname, "TXT");
  const txt = answers.find((a) => a.type === 16);
  if (txt) return txt.data.replace(/^"|"$/g, "");

  // TXT options (authSource/replicaSet) are optional — the driver can
  // discover the replica set from the seed list.
  return "";
}

/**
 * Convert a mongodb+srv:// URI into a standard mongodb:// seed-list URI by
 * resolving the SRV and TXT records ourselves.
 */
async function srvToSeedlistUri(srvUri: string): Promise<string> {
  const match = srvUri.match(/^mongodb\+srv:\/\/(?:([^@]+)@)?([^/?]+)(\/[^?]*)?(?:\?(.*))?$/);
  if (!match) return srvUri;
  const [, auth, srvHost, path, query] = match;

  const [targets, txtOptions] = await Promise.all([
    resolveSrvRecords(`_mongodb._tcp.${srvHost}`),
    resolveTxtOptions(srvHost),
  ]);

  // Per the SRV spec: TXT record supplies defaults, URI query options
  // override them, and mongodb+srv implies TLS unless explicitly disabled.
  const params = new URLSearchParams(txtOptions);
  for (const [key, value] of new URLSearchParams(query || "")) {
    params.set(key, value);
  }
  if (!params.has("tls") && !params.has("ssl")) params.set("tls", "true");

  const hosts = targets.map((t) => `${t.name}:${t.port}`).join(",");
  return `mongodb://${auth ? `${auth}@` : ""}${hosts}${path || "/"}?${params.toString()}`;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  resolvedUri: string | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache || {
  conn: null,
  promise: null,
  resolvedUri: null,
};

if (!globalThis.mongooseCache) {
  globalThis.mongooseCache = cached;
}

/**
 * Connect to MongoDB Atlas (database: 'agent_brand_db')
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // A previously established connection has dropped (readyState 0/3) — clear
  // the cache so we reconnect instead of handing back the dead instance.
  if (cached.conn && mongoose.connection.readyState !== 2) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI (or DATABASE_URL) is not set — add it to .env.local or .env"
    );
  }

  if (!cached.promise) {
    cached.promise = (async () => {
      if (!cached.resolvedUri) {
        cached.resolvedUri = MONGODB_URI.startsWith("mongodb+srv://")
          ? await srvToSeedlistUri(MONGODB_URI)
          : MONGODB_URI;
      }

      const opts: mongoose.ConnectOptions = {
        bufferCommands: false,
        dbName: MONGODB_DB,
        serverSelectionTimeoutMS: 8000,
      };

      const m = await mongoose.connect(cached.resolvedUri, opts);
      console.log(`Connected to MongoDB Atlas: database '${MONGODB_DB}'`);
      return m;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    // Re-resolve DNS on the next attempt — the Atlas hosts may have moved
    cached.promise = null;
    cached.resolvedUri = null;
    throw e;
  }

  return cached.conn;
}
