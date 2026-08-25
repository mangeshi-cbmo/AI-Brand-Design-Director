import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.DATABASE_URL ||
  "mongodb+srv://agent_brand_db:4vQ2gNWnCmCBUwy4@agentbrandcluster.xoeml2r.mongodb.net/agent_brand_db?appName=AgentBrandCluster";

const MONGODB_DB = process.env.MONGODB_DB || "agent_brand_db";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.mongooseCache || {
  conn: null,
  promise: null,
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

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: MONGODB_DB,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log(`Connected to MongoDB Atlas: database '${MONGODB_DB}'`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
