import { NextRequest, NextResponse } from "next/server";
import { AgentOrchestrator, AgentContext } from "@/lib/ai/agent-orchestrator";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

interface ChatPayload {
  message: string;
  context: AgentContext;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || "guest@logoforge.ai";

    const body: ChatPayload = await req.json();
    const userMessage = (body.message || "").trim();
    const context = body.context || {};

    if (!userMessage) {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    // Run pure OpenAI Agent Orchestration reasoning loop
    const result = await AgentOrchestrator.processMessage(
      userMessage,
      context,
      userEmail
    );

    return NextResponse.json({
      success: true,
      data: result,
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
