import mongoose, { Schema, Document, Model } from "mongoose";
import { BrandGuidelines } from "@/types/brand";

export interface IMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  quickOptions?: { label: string; value: string }[];
  logoData?: {
    logoId?: string;
    imageUrl?: string;
    brandName?: string;
    style?: string;
    promptUsed?: string;
    /** ids of every generated concept — images are hydrated from the logos collection */
    variantLogoIds?: string[];
  };
  brandGuidelines?: BrandGuidelines;
  createdAt: Date;
}

export interface IConversation extends Document {
  userId: string;
  sessionId: string;
  title: string;
  brandContext: {
    brandName?: string;
    industry?: string;
    style?: string;
    colorPalette?: string;
    concept?: string;
    slogan?: string;
  };
  messages: IMessage[];
  status: "active" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    id: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    quickOptions: [
      {
        label: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],
    logoData: {
      logoId: { type: String },
      imageUrl: { type: String },
      brandName: { type: String },
      style: { type: String },
      promptUsed: { type: String },
      variantLogoIds: { type: [String], default: undefined },
    },
    brandGuidelines: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Brand Conversation",
    },
    brandContext: {
      brandName: { type: String },
      industry: { type: String },
      style: { type: String },
      colorPalette: { type: String },
      concept: { type: String },
      slogan: { type: String },
    },
    messages: [MessageSchema],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
    collection: "conversations",
  }
);

export const ConversationModel: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);
