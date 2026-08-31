import { buildBrandGuidelines } from "./brand-guidelines";
import { generateJson } from "./gemini";
import { generateStructuredLogos } from "./svg-logo-prompt";
import { renderLogoDataToDataUrl } from "./svg-renderer";
import { LogoService } from "@/services/logo.service";
import { GeneratedLogo, LogoStyle, ColorPalette, LogoData } from "@/types/logo";
import { BrandGuidelines } from "@/types/brand";
import { QuickOption } from "@/types/chat";

/* How many distinct logo concepts each generation produces */
const CONCEPT_COUNT = 4;

const STYLE_ALIASES: Array<{ style: LogoStyle; patterns: RegExp[] }> = [
  { style: "minimalist", patterns: [/minimal/i, /clean/i, /simple/i, /flat/i, /vector/i] },
  { style: "modern-gradient", patterns: [/gradient/i, /modern/i, /fluid/i, /dynamic/i] },
  { style: "abstract-geometric", patterns: [/abstract/i, /geometric/i, /shape/i, /symbol/i] },
  { style: "mascot-character", patterns: [/mascot/i, /character/i, /cartoon/i] },
  { style: "vintage-badge", patterns: [/vintage/i, /retro/i, /badge/i, /heritage/i] },
  { style: "tech-cyberpunk", patterns: [/tech/i, /cyber/i, /futur/i, /digital/i, /ai/i] },
  { style: "luxurious-monogram", patterns: [/lux/i, /premium/i, /monogram/i, /elegant/i] },
  { style: "3d-isometric", patterns: [/3d/i, /isometric/i, /depth/i] },
];

const PALETTE_ALIASES: Array<{ palette: ColorPalette; patterns: RegExp[] }> = [
  { palette: "vibrant", patterns: [/vibrant/i, /bold/i, /colorful/i, /energetic/i] },
  { palette: "monochrome", patterns: [/mono/i, /black/i, /white/i, /neutral/i] },
  { palette: "pastel", patterns: [/pastel/i, /soft/i, /calm/i] },
  { palette: "neon", patterns: [/neon/i, /electric/i, /glow/i] },
  { palette: "earthy", patterns: [/earth/i, /organic/i, /natural/i, /green/i] },
  { palette: "corporate-blue", patterns: [/corporate/i, /blue/i, /trust/i, /professional/i] },
  { palette: "gold-luxury", patterns: [/gold/i, /lux/i, /premium/i, /black and gold/i] },
];

function pickStyle(input: string): LogoStyle {
  return STYLE_ALIASES.find(({ patterns }) => patterns.some((pattern) => pattern.test(input)))
    ?.style || "minimalist";
}

function pickPalette(input: string): ColorPalette {
  return PALETTE_ALIASES.find(({ patterns }) => patterns.some((pattern) => pattern.test(input)))
    ?.palette || "monochrome";
}

function applyPendingFieldAnswer(input: string, context: AgentContext): AgentContext | null {
  const trimmed = input.trim();
  // Don't swallow guideline requests or direct action commands into field values
  if (/guideline|brand kit|style guide|identity system|brand book|generate|create|make/i.test(trimmed)) {
    return null;
  }

  if (!context.brandName) {
    return { ...context, brandName: input };
  }

  if (!context.industry) {
    return { ...context, industry: input };
  }

  if (!context.style) {
    return {
      ...context,
      style: pickStyle(input),
      concept: context.concept || input,
    };
  }

  if (!context.colorPalette) {
    return {
      ...context,
      colorPalette: pickPalette(input),
      concept: context.concept || input,
    };
  }

  return null;
}

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
    const isGuidelinesIntent = /guideline|brand kit|style guide|identity system|brand book/i.test(trimmedInput);
    const pendingContext = isGuidelinesIntent ? null : applyPendingFieldAnswer(trimmedInput, context);

    // 1. Construct conversational reasoning prompt
    const systemPrompt = `You are "LogoForge AI Architect", an elite commercial brand identity director and graphic designer.
Your task is to converse with a founder/client, gather their brand details, and guide them to craft a world-class logo mark.

Current brand context gathered so far:
${JSON.stringify(pendingContext || context, null, 2)}

Instructions:
1. If "brandName" is missing, extract or ask for their Brand Name.
2. If "industry" is missing, ask what industry/market they operate in.
3. If "style" is missing, guide them to choose a visual style (e.g., Minimalist Vector, Abstract Geometric, 3D Isometric, Luxury Monogram, Tech/Cyber). If the user typed a custom style, keep their wording as "concept" and map it to the nearest allowed style.
4. If brandName, industry, and style are known OR the user explicitly requests to generate/refine, set "shouldGenerateLogo": true.
5. Provide 3-5 concise, clickable quick options for the user to tap.
6. When refining an existing logo, explain what artistic improvements you made.
6b. When "shouldGenerateLogo" is true, tell the user you are crafting 4 distinct editable logo concepts, and invite them to pick their favorite concept and customize it in the editor. Do NOT mention brand guidelines at this point — they are a separate step the user can request later.
6c. After logos have been generated (i.e. context already has brandName, industry, and style filled and a logo was previously created), always include a quick option like "Generate Brand Guidelines" to let the user request them when ready.
6d. If the user explicitly asks for brand guidelines, identity system, brand kit, or style guide, set "shouldGenerateGuidelines": true.
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
  "shouldGenerateGuidelines": boolean,
  "quickOptions": [
    { "label": "Option Title", "value": "Text value to send" }
  ]
}`;

    let parsedResponse: {
      assistantMessage: string;
      updatedContext: AgentContext;
      shouldGenerateLogo: boolean;
      shouldGenerateGuidelines?: boolean;
      quickOptions?: QuickOption[];
    };

    try {
      parsedResponse = await generateJson<typeof parsedResponse>({
        system: systemPrompt,
        user: pendingContext
          ? `User message: "${trimmedInput}"\nThis message is the user's answer for the currently pending brand.spec field. Continue from the updated context; do not restart the conversation or reinterpret earlier completed fields.`
          : `User message: "${trimmedInput}"`,
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
        assistantMessage: isGuidelinesIntent
          ? `I have compiled the brand guidelines and identity system for ${(pendingContext || context).brandName || "your brand"}.`
          : `I received your request for "${trimmedInput}". Let's craft your logo.`,
        updatedContext: {
          ...(pendingContext || context),
          brandName: (pendingContext || context).brandName || (isGuidelinesIntent ? "Brand" : trimmedInput),
          industry: (pendingContext || context).industry || "Technology & AI",
          style: (pendingContext || context).style || "minimalist",
        },
        shouldGenerateLogo: !isGuidelinesIntent,
        shouldGenerateGuidelines: isGuidelinesIntent,
        quickOptions: isGuidelinesIntent
          ? [
              { label: "Make a 3D version", value: "Make a 3D isometric version" },
              { label: "Refine palette", value: "Try a vibrant color palette" },
            ]
          : [
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
      ...(pendingContext || {}),
      ...parsedResponse.updatedContext,
    };

    let generatedLogos: GeneratedLogo[] = [];
    let brandGuidelines: BrandGuidelines | undefined = undefined;

    // 2. If the agent decided it's time to generate or refine the logo
    if (parsedResponse.shouldGenerateLogo && updatedCtx.brandName && !isGuidelinesIntent) {
      const generationParams = {
        brandName: updatedCtx.brandName,
        industry: updatedCtx.industry || "Technology",
        style: (updatedCtx.style || "minimalist") as LogoStyle,
        colorPalette: (updatedCtx.colorPalette || "monochrome") as ColorPalette,
        conceptDescription: updatedCtx.concept,
        slogan: updatedCtx.slogan,
      };

      let logoDataConcepts: LogoData[] = [];

      try {
        console.log(
          `Generating ${CONCEPT_COUNT} structured SVG logo concepts...`
        );
        logoDataConcepts = await generateStructuredLogos(generationParams);
      } catch (genError) {
        console.error("Structured logo generation error:", genError);
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
      const promptUsed = `Structured SVG logo for "${generationParams.brandName}" in ${generationParams.industry} (${generationParams.style}, ${generationParams.colorPalette})`;

      const savedLogos = await Promise.all(
        conceptsWithPreviews.map(({ imageUrl, logoData }) =>
          LogoService.saveLogo(
            {
              brandName: generationParams.brandName,
              slogan: generationParams.slogan,
              industry: generationParams.industry,
              style: generationParams.style,
              colorPalette: generationParams.colorPalette,
              conceptDescription: updatedCtx.concept,
            },
            imageUrl,
            promptUsed,
            userEmail,
            logoData
          )
        )
      );

      generatedLogos = savedLogos;
    }

    // Generate brand guidelines when requested explicitly or inferred by intent
    const shouldBuildGuidelines =
      Boolean(parsedResponse.shouldGenerateGuidelines) ||
      (isGuidelinesIntent && Boolean(updatedCtx.brandName));

    if (shouldBuildGuidelines && (updatedCtx.brandName || context.brandName)) {
      const activeBrandName = updatedCtx.brandName || context.brandName || "Brand";
      try {
        console.log(`Generating brand guidelines for "${activeBrandName}"...`);
        brandGuidelines = await buildBrandGuidelines({
          brandName: activeBrandName,
          industry: updatedCtx.industry || context.industry || "Technology",
          style: (updatedCtx.style || context.style || "minimalist") as LogoStyle,
          colorPalette: (updatedCtx.colorPalette || context.colorPalette || "monochrome") as ColorPalette,
          concept: updatedCtx.concept || context.concept,
          slogan: updatedCtx.slogan || context.slogan,
        });

        // Ensure conversational response acknowledges the guidelines
        if (isGuidelinesIntent) {
          parsedResponse.assistantMessage = `I have compiled the comprehensive Brand Guidelines & Identity System for ${activeBrandName}. Explore the typography pairings, color specifications, personality attributes, and logo usage rules below.`;
          parsedResponse.quickOptions = [
            { label: "Create New Logo", value: "Create a new logo" },
            { label: "Refine Brand Name", value: "Change brand name" },
          ];
        }
      } catch (guidelinesError) {
        console.error("Brand guidelines generation error:", guidelinesError);
      }
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
