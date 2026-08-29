import { connectDB } from "@/lib/db/client";
import {
  ConversationModel,
  IConversation,
  IMessage,
} from "@/lib/db/models/conversation.model";
import { AgentContext } from "@/lib/ai/agent-orchestrator";
import { BrandGuidelines } from "@/types/brand";

export class ConversationService {
  /**
   * Get or initialize a conversation by sessionId and userId
   */
  static async getOrCreateConversation(
    userId: string,
    sessionId: string,
    initialMessage?: string
  ): Promise<IConversation> {
    await connectDB();

    let conv = await ConversationModel.findOne({ sessionId });

    if (!conv) {
      conv = await ConversationModel.create({
        userId,
        sessionId,
        title: "New Logo Project",
        brandContext: {},
        messages: initialMessage
          ? [
              {
                id: `msg-${Date.now()}`,
                role: "assistant",
                content: initialMessage,
                createdAt: new Date(),
              },
            ]
          : [],
        status: "active",
      });
    }

    return conv;
  }

  /**
   * Save user and assistant messages & update brand context in MongoDB
   */
  static async appendTurn(
    sessionId: string,
    userId: string,
    userMessageText: string,
    assistantMessageText: string,
    updatedContext: AgentContext,
    quickOptions?: { label: string; value: string }[],
    logoData?: {
      logoId?: string;
      imageUrl?: string;
      brandName?: string;
      style?: string;
      promptUsed?: string;
      variantLogoIds?: string[];
    },
    brandGuidelines?: BrandGuidelines
  ): Promise<IConversation | null> {
    await connectDB();

    const userMessage: IMessage = {
      id: `msg-u-${Date.now()}`,
      role: "user",
      content: userMessageText,
      createdAt: new Date(),
    };

    const assistantMessage: IMessage = {
      id: `msg-a-${Date.now() + 1}`,
      role: "assistant",
      content: assistantMessageText,
      quickOptions,
      logoData,
      brandGuidelines,
      createdAt: new Date(),
    };

    const conv = await ConversationModel.findOneAndUpdate(
      { sessionId },
      {
        $setOnInsert: { userId, sessionId },
        $set: {
          brandContext: updatedContext,
          status: "active",
        },
        $push: {
          messages: { $each: [userMessage, assistantMessage] },
        },
      },
      { returnDocument: 'after', upsert: true }
    );

    return conv;
  }

  /**
   * Update conversation title (rename session)
   */
  static async updateConversationTitle(
    sessionId: string,
    userId: string,
    title: string
  ) {
    await connectDB();
    return ConversationModel.findOneAndUpdate(
      { sessionId, userId },
      { $set: { title } },
      { returnDocument: 'after' }
    );
  }

  /**
   * Get all conversations for a user
   */
  static async getUserConversations(userId: string) {
    await connectDB();
    return ConversationModel.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
  }

  /**
   * Get a conversation by sessionId
   */
  static async getConversationBySessionId(sessionId: string) {
    await connectDB();
    return ConversationModel.findOne({ sessionId }).lean();
  }

  /**
   * Delete a conversation by sessionId and userId
   */
  static async deleteConversation(sessionId: string, userId: string) {
    await connectDB();
    return ConversationModel.findOneAndDelete({ sessionId, userId });
  }
}
