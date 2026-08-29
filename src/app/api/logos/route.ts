import { NextRequest, NextResponse } from "next/server";
import { LogoService } from "@/services/logo.service";
import { ApiResponse } from "@/types/api";
import { GeneratedLogo } from "@/types/logo";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || undefined;
    const idsParam = req.nextUrl.searchParams.get("ids");
    const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    // Fetch from MongoDB Atlas 'logo' database
    const logos = await LogoService.getAllLogos(userEmail, ids);

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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" } satisfies ApiResponse,
        { status: 401 }
      );
    }

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing logo id" } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const deleted = await LogoService.deleteLogo(id, userEmail);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Logo not found or not owned by you" } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true } satisfies ApiResponse);
  } catch (error) {
    console.error("Error in DELETE /api/logos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete logo" } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
