import { LogoGenerationParams, LogoStyle, ColorPalette } from "@/types/logo";

const STYLE_PROMPTS: Record<LogoStyle, string> = {
  minimalist: "minimalist vector emblem, clean lines, flat design, modern simplicity, iconic, white background",
  "modern-gradient": "modern dynamic emblem with smooth vibrant gradient accents, sleek fluid curves, vector logo style",
  "abstract-geometric": "abstract geometric logo, sharp angles, sacred geometry, golden ratio, balanced symmetry, vector icon",
  "mascot-character": "friendly mascot vector logo, high charm, expressive character badge, bold contour lines, esports style",
  "vintage-badge": "retro vintage emblem badge, rustic artisan stamp, classic typography framing, heritage crest",
  "tech-cyberpunk": "futuristic tech logo, cybernetic neon accents, digital circuitry glyph, high precision",
  "luxurious-monogram": "luxurious elegant monogram crest, premium serif intertwined letters, high-end fashion branding, royal aesthetics",
  "3d-isometric": "sleek 3d isometric logo symbol, soft ambient occlusion, clean matte material, modern tech startup style",
};

const COLOR_PROMPTS: Record<ColorPalette, string> = {
  vibrant: "vibrant harmonious colors, energetic palette",
  monochrome: "monochromatic black and white, high contrast, clean negative space",
  pastel: "soft pastel tones, elegant and soothing color scheme",
  neon: "bright luminescent neon colors on dark or neutral backdrop",
  earthy: "organic warm terracotta, forest green, warm stone, natural palette",
  "corporate-blue": "trustworthy royal navy and cobalt blue tones with subtle silver",
  "gold-luxury": "refined metallic gold foil and deep charcoal black luxury palette",
};

/**
 * Builds an engineered master prompt for the AI image generator
 */
export function buildLogoPrompt(params: LogoGenerationParams): string {
  const styleDescription = STYLE_PROMPTS[params.style] || STYLE_PROMPTS.minimalist;
  const colorDescription = COLOR_PROMPTS[params.colorPalette] || COLOR_PROMPTS.vibrant;

  return [
    `Professional commercial logo for brand "${params.brandName}".`,
    `Industry: ${params.industry}.`,
    params.conceptDescription ? `Concept & Theme: ${params.conceptDescription}.` : "",
    params.slogan ? `With tagline essence: "${params.slogan}".` : "",
    `Style: ${styleDescription}.`,
    `Colors: ${colorDescription}.`,
    "Strict requirements: High quality vector logo mark, isolated on a clean neutral background, no realistic photorealistic textures, no blurry edges, centered, crisp vector graphic, masterpiece branding design.",
  ]
    .filter(Boolean)
    .join(" ");
}
