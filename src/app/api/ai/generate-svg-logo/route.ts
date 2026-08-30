import { NextRequest, NextResponse } from "next/server";
import { generateStructuredLogos } from "@/lib/ai/svg-logo-prompt";
import { renderLogoDataToSvg, renderLogoDataToDataUrl } from "@/lib/ai/svg-renderer";
import { LogoService } from "@/services/logo.service";
import { ApiResponse } from "@/types/api";
import { GeneratedLogo, LogoStyle, ColorPalette } from "@/types/logo";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { tokenContext, newRequestId } from "@/services/token-usage.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || undefined;
    const body = await req.json();

    const {
      brandName,
      slogan,
      industry,
      style = "minimalist",
      colorPalette = "monochrome",
      conceptDescription,
    } = body;

    if (!brandName || !industry) {
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        message: "brandName and industry are required",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const params = {
      brandName,
      slogan,
      industry,
      style: style as LogoStyle,
      colorPalette: colorPalette as ColorPalette,
      conceptDescription,
    };

    const projectId = body.projectId || `logo_${Date.now()}`;
    // 1. Generate structured logo concepts via Gemini text model
    const concepts = await tokenContext.run({ requestId: newRequestId(), userId: userEmail || "guest_user", projectId }, () => generateStructuredLogos(params));

    // 2. Render each concept to SVG data URLs for preview
    const results: GeneratedLogo[] = [];

    for (const logoData of concepts) {
      const imageUrl = renderLogoDataToDataUrl(logoData);
      const svgData = renderLogoDataToSvg(logoData);
      const promptUsed = `Structured SVG logo for "${brandName}" in ${industry} (${style}, ${colorPalette})`;

      const saved = await LogoService.saveLogo(
        params,
        imageUrl,
        promptUsed,
        userEmail,
        logoData
      );

      results.push({
        ...saved,
        svgData,
        logoData,
      });
    }

    const response: ApiResponse<GeneratedLogo[]> = {
      success: true,
      data: results,
      message: `Generated ${results.length} editable logo concepts`,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error in generate-svg-logo API:", error);
    const response: ApiResponse = {
      success: false,
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Failed to generate SVG logo",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
