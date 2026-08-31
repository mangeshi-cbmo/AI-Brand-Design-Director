import mongoose, { Model, Schema } from "mongoose";

export interface ITokenUsage {
  requestId: string;
  userId: string;
  projectId: string;
  model: string;
  provider: "google";
  operation: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  createdAt?: Date;
}

const TokenUsageSchema = new Schema<ITokenUsage>({
  requestId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  model: { type: String, required: true, index: true },
  provider: { type: String, enum: ["google"], required: true, default: "google" },
  operation: { type: String, required: true, index: true },
  inputTokens: { type: Number, required: true, min: 0 },
  outputTokens: { type: Number, required: true, min: 0 },
  totalTokens: { type: Number, required: true, min: 0 },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: "token_usage" });

TokenUsageSchema.index({ userId: 1, createdAt: -1 });
TokenUsageSchema.index({ projectId: 1, createdAt: -1 });

export const TokenUsageModel: Model<ITokenUsage> = mongoose.models.TokenUsage || mongoose.model<ITokenUsage>("TokenUsage", TokenUsageSchema);
