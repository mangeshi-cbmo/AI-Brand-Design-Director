import { randomUUID } from "crypto";
import { AsyncLocalStorage } from "async_hooks";
import { connectDB } from "@/lib/db/client";
import { TokenUsageModel } from "@/lib/db/models/token-usage.model";

export interface TokenContext { requestId: string; userId: string; projectId: string; }
export const tokenContext = new AsyncLocalStorage<TokenContext>();
export const newRequestId = () => randomUUID();

export async function recordTokenUsage(data: { model: string; operation: string; inputTokens: number; outputTokens: number; totalTokens: number; provider?: "google" }) {
  const ctx = tokenContext.getStore();
  if (!ctx) return;
  try { await connectDB(); await TokenUsageModel.create({ ...data, provider: "google", ...ctx }); }
  catch (error) { console.error("Token usage persistence failed:", error); }
}

export async function getTokenUsage(userId: string, projectId?: string) {
  await connectDB();
  const match: Record<string, string> = { userId };
  if (projectId) match.projectId = projectId;
  const [summary, byModel, recent] = await Promise.all([
    TokenUsageModel.aggregate([{ $match: match }, { $group: { _id: null, inputTokens: { $sum: "$inputTokens" }, outputTokens: { $sum: "$outputTokens" }, totalTokens: { $sum: "$totalTokens" }, requests: { $sum: 1 } } }]),
    TokenUsageModel.aggregate([{ $match: match }, { $group: { _id: "$model", totalTokens: { $sum: "$totalTokens" }, requests: { $sum: 1 } } }, { $sort: { totalTokens: -1 } }]),
    TokenUsageModel.find(match).sort({ createdAt: -1 }).limit(20).lean(),
  ]);
  return { summary: summary[0] || { inputTokens: 0, outputTokens: 0, totalTokens: 0, requests: 0 }, byModel, recent };
}
