import { AIImageGenerationRequest, AIImageGenerationResponse } from "@/types/ai";
import { generateLogoImages } from "./gemini";
import { stripBackground } from "./strip-background";

export interface IAIService {
  generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse>;
}

/**
 * Google Gemini / Imagen image generation provider (via the GenAI SDK,
 * authenticated through Vertex AI ADC or a Gemini API key)
 */
class GeminiService implements IAIService {
  async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    const [rawImage] = await generateLogoImages(request.prompt, 1);
    const imageUrl = rawImage ? await stripBackground(rawImage) : "";

    return {
      imageUrl,
      revisedPrompt: request.prompt,
    };
  }
}

/**
 * Mock Provider for offline tests
 */
class MockAIService implements IAIService {
  async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    await new Promise((res) => setTimeout(res, 800));
    return {
      imageUrl: "https://placehold.co/800x800/000000/ffffff?text=Logo+Mark",
      revisedPrompt: request.prompt,
    };
  }
}

export function getAIService(): IAIService {
  const hasGoogleAuth =
    process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" ||
    Boolean(process.env.GEMINI_API_KEY || process.env.AI_API_KEY);

  if (hasGoogleAuth) {
    return new GeminiService();
  }
  return new MockAIService();
}
