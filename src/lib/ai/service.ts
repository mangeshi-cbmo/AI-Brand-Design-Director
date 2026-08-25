import OpenAI from "openai";
import { AIImageGenerationRequest, AIImageGenerationResponse } from "@/types/ai";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY ||
    process.env.AI_API_KEY ||
    "",
});

export interface IAIService {
  generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse>;
}

/**
 * OpenAI Image Generation Provider (gpt-image-1 / dall-e)
 */
class OpenAIService implements IAIService {
  async generateImage(request: AIImageGenerationRequest): Promise<AIImageGenerationResponse> {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: request.prompt,
      n: 1,
    });

    const item = response.data?.[0];
    const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");

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
  if (process.env.OPENAI_API_KEY || process.env.AI_API_KEY) {
    return new OpenAIService();
  }
  return new MockAIService();
}
