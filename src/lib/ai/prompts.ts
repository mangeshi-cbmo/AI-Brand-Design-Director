import { LogoGenerationParams, LogoStyle, ColorPalette } from "@/types/logo";

const STYLE_PROMPTS: Record<LogoStyle, string> = {
  minimalist: "minimalist vector emblem, clean lines, flat design, modern simplicity, iconic",
  "modern-gradient": "modern dynamic emblem with smooth vibrant gradient accents, sleek fluid curves, vector logo style",
  "abstract-geometric": "abstract geometric logo, sharp angles, sacred geometry, golden ratio, balanced symmetry, vector icon",
  "mascot-character": "friendly mascot vector logo, high charm, expressive character badge, bold contour lines, esports style",
  "vintage-badge": "retro vintage emblem badge, rustic artisan stamp, ornamental crest framing, heritage aesthetic",
  "tech-cyberpunk": "futuristic tech logo, cybernetic neon accents, digital circuitry glyph, high precision",
  "luxurious-monogram": "luxurious elegant monogram crest, premium serif intertwined letters, high-end fashion branding, royal aesthetics",
  "3d-isometric": "sleek 3d isometric logo symbol, soft ambient occlusion, clean matte material, modern tech startup style",
};

const COLOR_PROMPTS: Record<ColorPalette, string> = {
  vibrant: "vibrant harmonious colors, energetic palette",
  monochrome: "monochromatic white and soft silver-gray tones, strong silhouette, clean negative space",
  pastel: "soft pastel tones, elegant and soothing color scheme",
  neon: "bright luminescent neon colors",
  earthy: "organic warm terracotta, forest green, warm stone, natural palette",
  "corporate-blue": "trustworthy royal navy and cobalt blue tones with subtle silver",
  "gold-luxury": "refined metallic gold foil and deep charcoal black luxury palette",
};

/**
 * Builds an engineered master prompt for the AI image generator.
 *
 * The generator produces ONLY the pictorial icon mark on a transparent
 * background — never the brand name or tagline. Text lives on separate,
 * fully editable fabric.js layers in the canvas editor (Canva-style),
 * so users can retype, restyle, and reposition it after generation.
 */
export function buildLogoPrompt(params: LogoGenerationParams): string {
  const styleDescription = STYLE_PROMPTS[params.style] || STYLE_PROMPTS.minimalist;
  const colorDescription = COLOR_PROMPTS[params.colorPalette] || COLOR_PROMPTS.vibrant;

  // A monogram is inherently letterforms — allow ONLY the brand initials
  // as the graphic mark itself. Every other style must be purely pictorial.
  const isMonogram = params.style === "luxurious-monogram";
  const initials = params.brandName
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);

  const subject = isMonogram
    ? `Luxury monogram logo mark built only from the intertwined initials "${initials}".`
    : `Standalone pictorial logo icon (symbol mark only) for a brand named "${params.brandName}".`;

  const textRule = isMonogram
    ? `The ONLY letterforms allowed are the initials "${initials}" forming the monogram itself — no full brand name, no other words, no tagline.`
    : "Absolutely NO text, NO letters, NO words, NO numbers, NO typography, NO brand name, NO tagline anywhere in the image — the mark must be purely pictorial.";

  return [
    subject,
    `Industry: ${params.industry}.`,
    params.conceptDescription ? `Concept & Theme: ${params.conceptDescription}.` : "",
    `Style: ${styleDescription}.`,
    `Colors: ${colorDescription}.`,
    textRule,
    "Strict requirements: one single centered emblem isolated on a completely FLAT, UNIFORM, single solid background color that strongly contrasts with the mark's colors — absolutely no background gradients, no texture, no pattern, no frame, no vignette, no cast shadow onto the surface. Crisp clean vector-style edges, no photorealistic textures, no blur, masterpiece branding design.",
  ]
    .filter(Boolean)
    .join(" ");
}
