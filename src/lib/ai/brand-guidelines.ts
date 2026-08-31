import { generateJson } from "./gemini";
import { BrandGuidelines } from "@/types/brand";
import { ColorPalette, LogoStyle } from "@/types/logo";
import {
  PALETTE_GUIDE,
  TYPE_PAIRINGS,
  FALLBACK_PERSONALITY,
  FALLBACK_DOS,
  FALLBACK_DONTS,
  fallbackStory,
} from "@/config/brand-kit";

interface GuidelinesInput {
  brandName: string;
  industry: string;
  style: LogoStyle;
  colorPalette: ColorPalette;
  concept?: string;
  slogan?: string;
}

/** Coerce any LLM output into exactly `n` clean strings, padding from fallback. */
function exactly<N extends string[]>(raw: unknown, fallback: N): N {
  const items = Array.isArray(raw)
    ? raw
        .map((s) => String(s).replace(/\*/g, "").trim())
        .filter((s) => s.length > 0 && s.length <= 120)
    : [];
  const merged = [...items.slice(0, fallback.length)];
  while (merged.length < fallback.length) merged.push(fallback[merged.length]);
  return merged as N;
}

function cleanText(raw: unknown, fallback: string): string {
  const text = typeof raw === "string" ? raw.replace(/\*/g, "").trim() : "";
  return text.length >= 20 ? text : fallback;
}

/**
 * Builds the brand guidelines document.
 *
 * Structure is 100% deterministic (fixed sections, fixed counts): colors and
 * typography come from static maps keyed by palette/style. Only the narrative
 * copy (story, personality, do's & don'ts) is AI-written — and it is
 * normalized to exact counts with fallbacks, so the template never varies.
 */
export async function buildBrandGuidelines(input: GuidelinesInput): Promise<BrandGuidelines> {
  const base: BrandGuidelines = {
    brandName: input.brandName,
    slogan: input.slogan?.trim() || "",
    industry: input.industry,
    style: input.style,
    colorPalette: input.colorPalette,
    story: fallbackStory(input.brandName, input.industry, input.concept),
    personality: [...FALLBACK_PERSONALITY] as BrandGuidelines["personality"],
    colors: PALETTE_GUIDE[input.colorPalette] || PALETTE_GUIDE.monochrome,
    typography: TYPE_PAIRINGS[input.style] || TYPE_PAIRINGS.minimalist,
    dos: [...FALLBACK_DOS] as BrandGuidelines["dos"],
    donts: [...FALLBACK_DONTS] as BrandGuidelines["donts"],
  };

  try {
    const raw = await generateJson<{
      story?: unknown;
      personality?: unknown;
      dos?: unknown;
      donts?: unknown;
      slogan?: unknown;
    }>({
      system: `You are a senior brand strategist writing copy for a brand guidelines document.
Respond strictly in JSON with EXACTLY this shape:
{
  "story": "2-3 sentence brand story paragraph, plain text, no asterisks",
  "personality": ["Adjective1", "Adjective2", "Adjective3", "Adjective4"],
  "dos": ["short usage rule", "short usage rule", "short usage rule", "short usage rule"],
  "donts": ["short misuse rule", "short misuse rule", "short misuse rule", "short misuse rule"],
  "slogan": "a short tagline (only if none was provided, else repeat the provided one)"
}
"personality" must be exactly 4 single-word adjectives. "dos" and "donts" must each be exactly 4 concise rules under 90 characters about correct/incorrect logo usage.`,
      user: `Brand: "${input.brandName}". Industry: ${input.industry}. Visual style: ${input.style}. Color palette: ${input.colorPalette}.${
        input.concept ? ` Concept: ${input.concept}.` : ""
      }${input.slogan ? ` Existing tagline: "${input.slogan}".` : ""}`,
      temperature: 0.6,
    });

    base.story = cleanText(raw.story, base.story);
    base.personality = exactly(raw.personality, base.personality);
    base.dos = exactly(raw.dos, base.dos);
    base.donts = exactly(raw.donts, base.donts);
    if (!base.slogan) base.slogan = cleanText(raw.slogan, "").slice(0, 80);
  } catch (err) {
    console.error("Brand guidelines copy generation failed, using fallback copy:", err);
  }

  return base;
}
