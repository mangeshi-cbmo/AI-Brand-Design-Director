import { GoogleGenAI } from "@google/genai";

/*
 * Google GenAI SDK client layer.
 *
 * Auth: Vertex AI with Application Default Credentials when
 * GOOGLE_GENAI_USE_VERTEXAI=true (gcloud auth application-default login,
 * optionally with service-account impersonation), otherwise a plain
 * GEMINI_API_KEY from Google AI Studio.
 */

export const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "imagen-4.0-generate-001";

const clientCache = new Map<string, GoogleGenAI>();

export function getGeminiClient(location?: string): GoogleGenAI {
  const useVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
  const loc = location || process.env.GOOGLE_CLOUD_LOCATION || "global";
  const key = useVertex ? `vertex:${loc}` : "apikey";

  let client = clientCache.get(key);
  if (client) return client;

  client = useVertex
    ? new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
        location: loc,
      })
    : new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY });

  clientCache.set(key, client);
  return client;
}

function stripCodeFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
}

/** One-shot JSON completion against the Gemini text model. */
export async function generateJson<T>(options: {
  system: string;
  user: string;
  temperature?: number;
  thinkingBudget?: number;
}): Promise<T> {
  const ai = getGeminiClient();
  
  const config: Record<string, unknown> = {
    systemInstruction: options.system,
    responseMimeType: "application/json",
    temperature: options.temperature ?? 0.7,
  };

  // If running on models that support thinkingConfig, minimize thinking latency for JSON extraction
  if (options.thinkingBudget !== undefined) {
    config.thinkingConfig = { thinkingBudget: options.thinkingBudget };
  } else {
    // Default 0 budget for instant structured data / JSON generation without 20s thinking delay
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  const response = await ai.models.generateContent({
    model: GEMINI_TEXT_MODEL,
    contents: [{ role: "user", parts: [{ text: options.user }] }],
    config,
  });
  return JSON.parse(stripCodeFences(response.text || "{}")) as T;
}

/**
 * Generate `count` logo images, returned as PNG data URLs.
 * Uses the Imagen generateImages API (native multi-image support) when the
 * configured model is an Imagen model, otherwise falls back to parallel
 * Gemini image-generation calls (one image per call).
 */
export async function generateLogoImages(prompt: string, count: number): Promise<string[]> {
  const location = process.env.GEMINI_IMAGE_LOCATION || process.env.GOOGLE_CLOUD_LOCATION;
  const ai = getGeminiClient(location);

  if (GEMINI_IMAGE_MODEL.includes("imagen")) {
    const response = await ai.models.generateImages({
      model: GEMINI_IMAGE_MODEL,
      prompt,
      config: {
        numberOfImages: count,
        aspectRatio: "1:1",
        outputMimeType: "image/png",
      },
    });
    return (response.generatedImages || [])
      .map((img) =>
        img.image?.imageBytes ? `data:image/png;base64,${img.image.imageBytes}` : ""
      )
      .filter(Boolean);
  }

  const calls = Array.from({ length: count }, async () => {
    const response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "1:1" },
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    return part?.inlineData?.data
      ? `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`
      : "";
  });
  return (await Promise.all(calls)).filter(Boolean);
}
