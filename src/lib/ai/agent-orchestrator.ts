import { buildLogoPrompt } from "./prompts";
import { buildBrandGuidelines } from "./brand-guidelines";
import { generateJson, generateLogoImages, GEMINI_IMAGE_MODEL } from "./gemini";
import { generateStructuredLogos } from "./svg-logo-prompt";
import { renderLogoDataToDataUrl } from "./svg-renderer";
import { stripBackground } from "./strip-background";
import { LogoService } from "@/services/logo.service";
import { GeneratedLogo, LogoStyle, ColorPalette, LogoData } from "@/types/logo";
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
   * GenAI SDK on Vertex AI) plus structured SVG generation for the logo
   * concepts.
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
6b. When "shouldGenerateLogo" is true, tell the user you are crafting 4 distinct editable logo concepts plus a complete brand guidelines document, and invite them to pick their favorite concept and customize it in the editor.
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

      let logoDataConcepts: LogoData[] = [];
      let guidelinesResult: BrandGuidelines | undefined = undefined;

      try {
        console.log(
          `Generating ${CONCEPT_COUNT} structured SVG logo concepts and brand guidelines in parallel...`
        );
        // Run both generation pipelines in parallel
        const [logosOutcome, guidelinesOutcome] = await Promise.allSettled([
          generateStructuredLogos(generationParams),
          buildBrandGuidelines({
            brandName: generationParams.brandName,
            industry: generationParams.industry,
            style: generationParams.style,
            colorPalette: generationParams.colorPalette,
            concept: updatedCtx.concept,
            slogan: updatedCtx.slogan,
          }),
        ]);

        if (logosOutcome.status === "fulfilled") {
          logoDataConcepts = logosOutcome.value;
        } else {
          console.error("Structured logo generation error:", logosOutcome.reason);
        }

        if (guidelinesOutcome.status === "fulfilled") {
          guidelinesResult = guidelinesOutcome.value;
        } else {
          console.error("Brand guidelines generation error:", guidelinesOutcome.reason);
        }
      } catch (genError) {
        console.error("Generation error:", genError);
      }

      // Render each concept to an SVG data URL for preview + backward compat
      const conceptsWithPreviews = logoDataConcepts.map((logoData) => ({
        logoData,
        imageUrl: renderLogoDataToDataUrl(logoData),
      }));

      // Provide a fallback if generation completely failed
      if (conceptsWithPreviews.length === 0) {
        conceptsWithPreviews.push({
          logoData: {
            brandName: updatedCtx.brandName,
            logoType: "combination-mark",
            colorPalette: [
              { hex: "#2D2D2D", role: "primary", label: "Primary" },
              { hex: "#6B6B6B", role: "secondary", label: "Secondary" },
              { hex: "#A0A0A0", role: "accent", label: "Accent" },
              { hex: "#FFFFFF", role: "background", label: "Background" },
              { hex: "#111111", role: "text", label: "Text" },
            ],
            fontRecommendations: [
              { family: "Inter", googleFontsName: "Inter", weight: 700, role: "heading" },
              { family: "Inter", googleFontsName: "Inter", weight: 400, role: "body" },
            ],
            layers: [
              {
                id: "fallback-text",
                type: "text",
                label: "Brand Name",
                content: updatedCtx.brandName,
                x: 250, y: 260, width: 400, height: 60,
                fill: "#111111",
                fontFamily: "Inter",
                fontSize: 48,
                fontWeight: 700,
                letterSpacing: 2,
                textAnchor: "middle",
                opacity: 1, rotation: 0, visible: true, locked: false,
              },
            ],
            canvasWidth: 500,
            canvasHeight: 500,
            backgroundColor: "#FFFFFF",
          },
          imageUrl: `https://placehold.co/800x800/000000/ffffff?text=${encodeURIComponent(
            updatedCtx.brandName
          )}+Logo`,
        });
      }

      // 3. Save every concept to MongoDB Atlas asynchronously
      const masterPrompt = buildLogoPrompt(generationParams);

      const savedLogos = await Promise.all(
        conceptsWithPreviews.map(({ imageUrl, logoData }) =>
          LogoService.saveLogo(
            {
              brandName: generationParams.brandName,
              industry: generationParams.industry,
              style: generationParams.style,
              colorPalette: generationParams.colorPalette,
              conceptDescription: updatedCtx.concept,
            },
            imageUrl,
            masterPrompt,
            userEmail,
            logoData
          )
        )
      );

      generatedLogos = savedLogos;
      brandGuidelines = guidelinesResult;
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
