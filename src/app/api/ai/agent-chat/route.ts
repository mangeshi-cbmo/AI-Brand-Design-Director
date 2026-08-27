import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator, AgentContext } from "@/lib/ai/agent-orchestrator";
import { ConversationService } from "@/services/conversation.service";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

interface ChatPayload {
  message: string;
  context: AgentContext;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || "guest_user";

    const body: ChatPayload = await req.json();
    const userMessage = (body.message || "").trim();
    const context = body.context || {};
    const sessionId = body.sessionId || `session_${Date.now()}`;

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // 1. Run the Gemini-powered agent orchestration reasoning loop
    const result = await AgentOrchestrator.processMessage(
      userMessage,
      context,
      userId
    );

    // 2. Persist entire conversation turn properly into MongoDB Atlas 'agent_brand_db'
    try {
      await ConversationService.appendTurn(
        sessionId,
        userId,
        userMessage,
        result.message,
        result.context,
        result.quickOptions,
        result.generatedLogo
          ? {
              logoId: result.generatedLogo.id,
              imageUrl: result.generatedLogo.imageUrl,
              brandName: result.generatedLogo.brandName,
              style: result.generatedLogo.style,
              promptUsed: result.generatedLogo.promptUsed,
              // ids only — variant images are hydrated from the logos
              // collection on reload to keep conversation docs small
              variantLogoIds: result.generatedLogos?.map((l) => l.id),
            }
          : undefined,
        result.brandGuidelines
      );
    } catch (dbError) {
      console.error("Warning: Failed to persist conversation turn to DB:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        sessionId,
      },
    });
  } catch (error) {
    console.error("Error in Agent Chat route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || "guest_user";

    if (sessionId) {
      const conversation = await ConversationService.getConversationBySessionId(sessionId);
      return NextResponse.json({ success: true, data: conversation });
    }

    const conversations = await ConversationService.getUserConversations(userId);
    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    // Degrade gracefully when Atlas is unreachable — the chat itself works
    // without persistence, so serve an empty history instead of a 500.
    return NextResponse.json({
      success: true,
      data: sessionId ? null : [],
      dbAvailable: false,
    });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || "guest_user";

    const body = await req.json();
    const { sessionId, title } = body;

    if (!sessionId || !title) {
      return NextResponse.json(
        { success: false, error: "sessionId and title are required" },
        { status: 400 }
      );
    }

    const updated = await ConversationService.updateConversationTitle(
      sessionId,
      userId,
      title.trim()
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating conversation title:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update title" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.email || "guest_user";
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "sessionId is required" },
        { status: 400 }
      );
    }

    await ConversationService.deleteConversation(sessionId, userId);
    return NextResponse.json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}
