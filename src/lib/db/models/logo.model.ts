import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILogoDocument extends Document {
  brandName: string;
  imageUrl: string;
  style: string;
  colorPalette: string;
  promptUsed: string;
  industry?: string;
  concept?: string;
  userEmail?: string;
  /** Structured editable logo data (SVG/JSON system) */
  logoData?: Record<string, unknown>;
  createdAt: Date;
}

const LogoSchema = new Schema<ILogoDocument>(
  {
    brandName: { type: String, required: true },
    imageUrl: { type: String, required: true },
    style: { type: String, default: "minimalist" },
    colorPalette: { type: String, default: "monochrome" },
    promptUsed: { type: String, required: true },
    industry: { type: String },
    concept: { type: String },
    userEmail: { type: String, default: "guest@logoforge.ai" },
    logoData: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: "logos",
  }
);

export const LogoModel: Model<ILogoDocument> =
  mongoose.models.Logo || mongoose.model<ILogoDocument>("Logo", LogoSchema);

