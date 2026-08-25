import { NextResponse } from "next/server";
import { LogoService } from "@/services/logo.service";
import { ApiResponse } from "@/types/api";
import { GeneratedLogo } from "@/types/logo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || undefined;

    // Fetch from MongoDB Atlas 'logo' database
    const logos = await LogoService.getAllLogos(userEmail);

    const response: ApiResponse<GeneratedLogo[]> = {
      success: true,
      data: logos,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/logos:", error);
    const response: ApiResponse = {
      success: false,
      error: "Failed to fetch logos from MongoDB Atlas",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
