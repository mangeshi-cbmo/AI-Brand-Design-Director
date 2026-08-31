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

    let idsToDelete: string[] = [];
    const idParam = req.nextUrl.searchParams.get("id");
    const idsParam = req.nextUrl.searchParams.get("ids");
    
    if (idsParam) {
      idsToDelete = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (idParam) {
      idsToDelete = [idParam.trim()];
    } else {
      try {
        const body = await req.json();
        if (Array.isArray(body?.ids)) {
          idsToDelete = body.ids.map(String).filter(Boolean);
        } else if (body?.id) {
          idsToDelete = [String(body.id)];
        }
      } catch {
        // body not json or empty
      }
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing logo id(s) to delete" } satisfies ApiResponse,
        { status: 400 }
      );
    }

    const count = await LogoService.deleteLogos(idsToDelete, userEmail);
    if (count === 0) {
      return NextResponse.json(
        { success: false, error: "No matching logos found or unauthorized" } satisfies ApiResponse,
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error("Error in DELETE /api/logos:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete logo(s)" } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
