import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { getTokenUsage } from "@/services/token-usage.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.email;
  if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try {
    const projectId = new URL(req.url).searchParams.get("projectId") || undefined;
    return NextResponse.json({ success: true, data: await getTokenUsage(userId, projectId) });
  } catch { return NextResponse.json({ success: false, error: "Usage unavailable" }, { status: 503 }); }
}
