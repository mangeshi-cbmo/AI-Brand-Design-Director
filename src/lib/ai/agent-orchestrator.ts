import { buildLogoPrompt } from "./prompts";
import { buildBrandGuidelines } from "./brand-guidelines";
import { generateJson, generateLogoImages, GEMINI_IMAGE_MODEL } from "./gemini";
import { stripBackground } from "./strip-background";
import { LogoService } from "@/services/logo.service";
import { GeneratedLogo, LogoStyle, ColorPalette } from "@/types/logo";
import { BrandGuidelines } from "@/types/brand";
import { QuickOption } from "@/types/chat";

/* How many distinct logo concepts each generation produces */
const CONCEPT_COUNT = 4;

export interface AgentContext {
  brandName?: string;
  industry?: string;
  style?: LogoStyle;
  colorPalette?: ColorPalette;
  concept?: string;
  slogan?: string;
}

export interface AgentOrchestrationResult {
  message: string;
  quickOptions?: QuickOption[];
  /** Primary (first) concept — kept for backward compatibility */
  generatedLogo?: GeneratedLogo;
  /** All generated concepts (CONCEPT_COUNT variations) */
  generatedLogos?: GeneratedLogo[];
  /** Fixed-template brand guidelines produced alongside the logos */
  brandGuidelines?: BrandGuidelines;
  context: AgentContext;
}

export class AgentOrchestrator {
  /**
   * Main conversational reasoning loop powered by Google Gemini (via the
   * GenAI SDK on Vertex AI) plus Google image models for the logo concepts.
   */
  static async processMessage(
    userMessage: string,
    context: AgentContext,
    userEmail?: string
  ): Promise<AgentOrchestrationResult> {
    const trimmedInput = userMessage.trim();

    // 1. Construct conversational reasoning prompt
    const systemPrompt = `You are "LogoForge AI Architect", an elite commercial brand identity director and graphic designer.
Your task is to converse with a founder/client, gather their brand details, and guide them to craft a world-class logo mark.

Current brand context gathered so far:
${JSON.stringify(context, null, 2)}

Instructions:
1. If "brandName" is missing, extract or ask for their Brand Name.
2. If "industry" is missing, ask what industry/market they operate in.
3. If "style" is missing, guide them to choose a visual style (e.g., Minimalist Vector, Abstract Geometric, 3D Isometric, Luxury Monogram, Tech/Cyber).
4. If brandName, industry, and style are known OR the user explicitly requests to generate/refine, set "shouldGenerateLogo": true.
5. Provide 3-5 concise, clickable quick options for the user to tap.
6. When refining an existing logo, explain what artistic improvements you made.
6b. When "shouldGenerateLogo" is true, tell the user you are crafting 4 distinct logo concepts plus a complete brand guidelines document, and invite them to pick their favorite concept.
7. NEVER use double asterisks or markdown bold stars (like **text**). Write clean, natural plain text without any asterisks.

Respond strictly in JSON matching this schema:
{
  "assistantMessage": "Your conversational response in plain text without any double asterisks",
  "updatedContext": {
    "brandName": string or null,
    "industry": string or null,
    "style": "minimalist" | "modern-gradient" | "abstract-geometric" | "mascot-character" | "vintage-badge" | "tech-cyberpunk" | "luxurious-monogram" | "3d-isometric" or null,
    "colorPalette": "vibrant" | "monochrome" | "pastel" | "neon" | "earthy" | "corporate-blue" | "gold-luxury" or null,
    "concept": string or null,
    "slogan": string or null
  },
  "shouldGenerateLogo": boolean,
  "quickOptions": [
    { "label": "Option Title", "value": "Text value to send" }
  ]
}`;

    let parsedResponse: {
      assistantMessage: string;
      updatedContext: AgentContext;
      shouldGenerateLogo: boolean;
      quickOptions?: QuickOption[];
    };

    try {
      parsedResponse = await generateJson<typeof parsedResponse>({
        system: systemPrompt,
        user: `User message: "${trimmedInput}"`,
        temperature: 0.7,
      });
      // Gemini can return an empty/blocked response, which generateJson turns
      // into `{}` or `null` — route those through the same fallback path so
      // the client never receives a message without text.
      if (
        !parsedResponse ||
        typeof parsedResponse !== "object" ||
        typeof parsedResponse.assistantMessage !== "string" ||
        !parsedResponse.assistantMessage.trim()
      ) {
        throw new Error("Model response missing assistantMessage");
      }
    } catch (llmError) {
      console.error("Gemini LLM Reasoning Error:", llmError);
      parsedResponse = {
        assistantMessage: `I received your request for "${trimmedInput}". Let's craft your logo.`,
        updatedContext: {
          ...context,
          brandName: context.brandName || trimmedInput,
          industry: context.industry || "Technology & AI",
          style: context.style || "minimalist",
        },
        shouldGenerateLogo: true,
        quickOptions: [
          { label: "Make it 3D", value: "Make a 3D isometric version" },
          { label: "Make it Minimal", value: "Make it ultra minimalist" },
        ],
      };
    }

    // Sanitize assistant message to guarantee zero double asterisks
    if (parsedResponse.assistantMessage) {
      parsedResponse.assistantMessage = parsedResponse.assistantMessage
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .trim();
    }

    const updatedCtx: AgentContext = {
      ...context,
      ...parsedResponse.updatedContext,
    };

    let generatedLogos: GeneratedLogo[] = [];
    let brandGuidelines: BrandGuidelines | undefined = undefined;

    // 2. If the agent decided it's time to generate or refine the logo
    if (parsedResponse.shouldGenerateLogo && updatedCtx.brandName) {
      const generationParams = {
        brandName: updatedCtx.brandName,
        industry: updatedCtx.industry || "Technology",
        style: (updatedCtx.style || "minimalist") as LogoStyle,
        colorPalette: (updatedCtx.colorPalette || "monochrome") as ColorPalette,
        conceptDescription: updatedCtx.concept,
        slogan: updatedCtx.slogan,
      };
      const masterPrompt = buildLogoPrompt(generationParams);

      let imageUrls: string[] = [];

      try {
        console.log(
          `Generating ${CONCEPT_COUNT} icon-only logo concepts using Google image model (${GEMINI_IMAGE_MODEL})...`
        );
        const rawImages = await generateLogoImages(masterPrompt, CONCEPT_COUNT);
        // Google image models return opaque images — clear the flat
        // background so the canvas editor gets transparent icon marks
        imageUrls = await Promise.all(rawImages.map((url) => stripBackground(url)));
      } catch (imageError) {
        console.error("Google Image Generation Error:", imageError);
      }

      if (imageUrls.length === 0) {
        imageUrls = [
          `https://placehold.co/800x800/000000/ffffff?text=${encodeURIComponent(
            updatedCtx.brandName
          )}+Logo`,
        ];
      }

      // 3. Save every concept to MongoDB Atlas, plus the brand guidelines copy
      const [savedLogos, guidelines] = await Promise.all([
        Promise.all(
          imageUrls.map((url) =>
            LogoService.saveLogo(
              {
                brandName: generationParams.brandName,
                industry: generationParams.industry,
                style: generationParams.style,
                colorPalette: generationParams.colorPalette,
                conceptDescription: updatedCtx.concept,
              },
              url,
              masterPrompt,
              userEmail
            )
          )
        ),
        buildBrandGuidelines({
          brandName: generationParams.brandName,
          industry: generationParams.industry,
          style: generationParams.style,
          colorPalette: generationParams.colorPalette,
          concept: updatedCtx.concept,
          slogan: updatedCtx.slogan,
        }),
      ]);

      generatedLogos = savedLogos;
      brandGuidelines = guidelines;
    }

    return {
      message: parsedResponse.assistantMessage,
      quickOptions: parsedResponse.quickOptions,
      generatedLogo: generatedLogos[0],
      generatedLogos: generatedLogos.length > 0 ? generatedLogos : undefined,
      brandGuidelines,
      context: updatedCtx,
    };
  }
}
