import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { connectDB } from "@/lib/db/client";
import { TotpSecretModel } from "@/lib/db/models/totp-secret.model";

/**
 * TOTP secrets are persisted in MongoDB (collection: totp_secrets) so that
 * login keeps working across server restarts, deployments, and multiple
 * server instances.
 *
 * A process-wide cache on `globalThis` sits in front of the database. Unlike
 * a module-scoped Map, `globalThis` is shared across the separately-bundled
 * API routes in `next dev` (the setup route and the NextAuth route otherwise
 * each get their own module instance — the original cause of valid codes
 * being rejected). It also keeps verification working within one process if
 * MongoDB is temporarily unreachable.
 */
declare global {
  var totpSecretCache: Map<string, string> | undefined;
}

const secretCache: Map<string, string> = globalThis.totpSecretCache || new Map();
if (!globalThis.totpSecretCache) {
  globalThis.totpSecretCache = secretCache;
}

async function loadSecretFromDB(email: string): Promise<string | null> {
  try {
    await connectDB();
    const doc = await TotpSecretModel.findOne({ email }).lean();
    return doc?.secret ?? null;
  } catch (err) {
    console.warn("TOTP: could not read secret from DB, falling back to cache:", err);
    return null;
  }
}

/**
 * Atomically create the secret if the email has none yet, otherwise return
 * the existing one (two concurrent setups converge on a single secret).
 * Returns null if the database is unreachable.
 */
async function createOrFetchSecretInDB(email: string, freshSecret: string): Promise<string | null> {
  try {
    await connectDB();
    const doc = await TotpSecretModel.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, secret: freshSecret } },
      { upsert: true, returnDocument: 'after' }
    ).lean();
    return doc?.secret ?? null;
  } catch (err) {
    console.warn("TOTP: could not persist secret to DB, using in-memory fallback:", err);
    return null;
  }
}

async function buildQrCodeUrl(email: string, secret: string): Promise<string> {
  const otpauth = generateURI({
    secret,
    label: email,
    issuer: "LogoForge",
  });

  return QRCode.toDataURL(otpauth, {
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Get the existing TOTP secret for an email, or create and persist a new one.
 * `isNew` is true only when a brand-new secret was minted — the UI uses it to
 * auto-open the QR setup panel.
 */
export async function getOrCreateTOTPSecret(
  email: string
): Promise<{ secret: string; qrCodeUrl: string; isNew: boolean }> {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Fast path: already known to this process
  let secret = secretCache.get(normalizedEmail) ?? null;
  let isNew = false;

  // 2. Database lookup
  if (!secret) {
    secret = await loadSecretFromDB(normalizedEmail);
  }

  // 3. Mint a new secret (atomic upsert so races return the stored one)
  if (!secret) {
    const fresh = generateSecret();
    const stored = await createOrFetchSecretInDB(normalizedEmail, fresh);
    secret = stored ?? fresh;
    // If the upsert returned exactly what we minted (or DB was down), it's new
    isNew = stored === null || stored === fresh;
  }

  secretCache.set(normalizedEmail, secret);
  const qrCodeUrl = await buildQrCodeUrl(normalizedEmail, secret);
  return { secret, qrCodeUrl, isNew };
}

export type TotpVerification = "valid" | "invalid-code" | "not-registered";

/**
 * Verify a 6-digit TOTP code against the user's stored secret.
 * Checks the process cache first, then MongoDB.
 */
export async function verifyTOTPToken(email: string, token: string): Promise<TotpVerification> {
  const normalizedEmail = email.toLowerCase().trim();

  let secret = secretCache.get(normalizedEmail) ?? null;
  if (!secret) {
    secret = await loadSecretFromDB(normalizedEmail);
    if (secret) secretCache.set(normalizedEmail, secret);
  }

  if (!secret) {
    return "not-registered";
  }

  try {
    const result = verifySync({
      token: token.trim(),
      secret,
      epochTolerance: 30, // accept codes from the adjacent 30s windows (clock drift)
    });
    return result.valid ? "valid" : "invalid-code";
  } catch (error) {
    console.error("TOTP verification error:", error);
    return "invalid-code";
  }
}
