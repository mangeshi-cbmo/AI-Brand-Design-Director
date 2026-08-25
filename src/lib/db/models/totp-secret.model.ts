import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITotpSecret extends Document {
  email: string;
  secret: string;
  createdAt: Date;
  updatedAt: Date;
}

const TotpSecretSchema = new Schema<ITotpSecret>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    secret: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "totp_secrets",
  }
);

export const TotpSecretModel: Model<ITotpSecret> =
  mongoose.models.TotpSecret ||
  mongoose.model<ITotpSecret>("TotpSecret", TotpSecretSchema);
