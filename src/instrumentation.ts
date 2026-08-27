export async function register() {
  // Warm the MongoDB connection once at server boot so the first API request
  // doesn't pay the DNS-resolution + connect cost. Node runtime only —
  // mongoose (and our dns-based SRV resolver) can't run on the edge runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { connectDB } = await import("@/lib/db/client");
    try {
      await connectDB();
    } catch (error) {
      // Don't block server startup if Atlas is unreachable — the cached
      // connectDB() will retry on the first request that needs the DB.
      console.error("MongoDB warm-up connection failed, will retry on demand:", error);
    }
  }
}
