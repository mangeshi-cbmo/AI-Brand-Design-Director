export type AIProvider = "gemini" | "openai" | "replicate" | "mock";

export interface AIImageGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: "1:1" | "16:9" | "4:3";
  quality?: "standard" | "hd";
}

export interface AIImageGenerationResponse {
  imageUrl: string;
  revisedPrompt?: string;
  seed?: number;
}
