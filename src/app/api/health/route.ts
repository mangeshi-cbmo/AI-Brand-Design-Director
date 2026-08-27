import { NextResponse } from "next/server";
import { ApiResponse } from "@/types/api";

export async function GET() {
  const response: ApiResponse<{ status: string; timestamp: string }> = {
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    message: "AI Logo Generator API is operational",
  };

  return NextResponse.json(response, { status: 200 });
}
