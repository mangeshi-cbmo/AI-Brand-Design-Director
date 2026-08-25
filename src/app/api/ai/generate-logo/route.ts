import { NextRequest, NextResponse } from "next/server";
import { generateLogoSchema } from "@/validators/logo.schema";
import { buildLogoPrompt } from "@/lib/ai/prompts";
import { getAIService } from "@/lib/ai/service";
import { LogoService } from "@/services/logo.service";
import { ApiResponse } from "@/types/api";
import { GeneratedLogo } from "@/types/logo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate payload with Zod
    const validation = generateLogoSchema.safeParse(body);
    if (!validation.success) {
      const response: ApiResponse = {
        success: false,
        error: "Validation failed",
        message: validation.error.issues.map((i) => i.message).join(", "),
      };
      return NextResponse.json(response, { status: 400 });
    }

    const params = validation.data;

    // 2. Engineer the prompt
    const engineeredPrompt = buildLogoPrompt(params);

    // 3. Call AI Service Provider (Gemini / OpenAI / Mock)
    const aiService = getAIService();
    const aiResult = await aiService.generateImage({
      prompt: engineeredPrompt,
    });

    // 4. Save to Database via Service layer
    const savedLogo = await LogoService.saveLogo(
      params,
      aiResult.imageUrl,
      engineeredPrompt
    );

    const response: ApiResponse<GeneratedLogo> = {
      success: true,
      data: savedLogo,
      message: "Logo generated successfully",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error in generate-logo API:", error);
    const response: ApiResponse = {
      success: false,
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : "Failed to generate logo",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
