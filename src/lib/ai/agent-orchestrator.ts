import OpenAI from "openai";
import { buildLogoPrompt } from "./prompts";
import { LogoService } from "@/services/logo.service";
import { GeneratedLogo, LogoStyle, ColorPalette } from "@/types/logo";
import { QuickOption } from "@/types/chat";

function getOpenAIClient(): OpenAI {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.AI_API_KEY ||
    "dummy-key-for-build";

  return new OpenAI({ apiKey });
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
  generatedLogo?: GeneratedLogo;
  context: AgentContext;
}

export class AgentOrchestrator {
  /**
   * Main conversational reasoning loop powered by OpenAI GPT-4o & OpenAI Image Models
   */
  static async processMessage(
    userMessage: string,
    context: AgentContext,
    userEmail?: string
  ): Promise<AgentOrchestrationResult> {
    const trimmedInput = userMessage.trim();
    const openai = getOpenAIClient();

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
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `User message: "${trimmedInput}"` },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const rawJson = completion.choices[0]?.message?.content || "{}";
      parsedResponse = JSON.parse(rawJson);
    } catch (llmError) {
      console.error("OpenAI LLM Reasoning Error:", llmError);
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

    let generatedLogo: GeneratedLogo | undefined = undefined;

    // 2. If the agent decided it's time to generate or refine the logo
    if (parsedResponse.shouldGenerateLogo && updatedCtx.brandName) {
      const masterPrompt = buildLogoPrompt({
        brandName: updatedCtx.brandName,
        industry: updatedCtx.industry || "Technology",
        style: updatedCtx.style || "minimalist",
        colorPalette: updatedCtx.colorPalette || "monochrome",
        conceptDescription: updatedCtx.concept,
        slogan: updatedCtx.slogan,
      });

      let imageUrl = "";

      try {
        console.log("Generating logo using OpenAI Image Model (gpt-image-1)...");
        const imageGen = await openai.images.generate({
          model: "gpt-image-1",
          prompt: masterPrompt,
          n: 1,
        });

        const item = imageGen.data?.[0];
        if (item?.url) {
          imageUrl = item.url;
        } else if (item?.b64_json) {
          imageUrl = `data:image/png;base64,${item.b64_json}`;
        }
      } catch (imageError) {
        console.error("OpenAI Image Generation Error:", imageError);
        imageUrl = `https://placehold.co/800x800/000000/ffffff?text=${encodeURIComponent(
          updatedCtx.brandName
        )}+Logo`;
      }

      // 3. Save to MongoDB Atlas 'agent_brand_db' database
      if (imageUrl) {
        generatedLogo = await LogoService.saveLogo(
          {
            brandName: updatedCtx.brandName,
            industry: updatedCtx.industry || "General",
            style: updatedCtx.style || "minimalist",
            colorPalette: updatedCtx.colorPalette || "monochrome",
            conceptDescription: updatedCtx.concept,
          },
          imageUrl,
          masterPrompt,
          userEmail
        );
      }
    }

    return {
      message: parsedResponse.assistantMessage,
      quickOptions: parsedResponse.quickOptions,
      generatedLogo,
      context: updatedCtx,
    };
  }
}
