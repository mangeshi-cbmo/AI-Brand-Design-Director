import { LogoGenerationParams, LogoData, LogoStyle, ColorPalette } from "@/types/logo";
import { generateJson } from "./gemini";

/* ------------------------------------------------------------------ */
/* Style-specific design direction for the AI                          */
/* ------------------------------------------------------------------ */

const STYLE_DIRECTIONS: Record<LogoStyle, string> = {
  minimalist:
    "Ultra-clean minimalist design. Thin lines, generous whitespace, simple geometric icon. Use a single-weight sans-serif font. The icon should be a simple, abstract geometric shape — circle, line, or minimal glyph.",
  "modern-gradient":
    "Modern design with bold gradient-filled shapes. Use a contemporary sans-serif font. The icon should feature overlapping shapes or fluid forms that would look striking with gradient fills.",
  "abstract-geometric":
    "Sharp geometric logo with angular, faceted shapes. Golden ratio proportions. Use a structured, geometric sans-serif font. The icon should be built from triangles, hexagons, or interlocking geometric forms.",
  "mascot-character":
    "Friendly, approachable design. Use a rounded, friendly sans-serif font. The icon should be a simple, stylized character or creature face rendered as clean SVG paths — keep it iconic rather than detailed.",
  "vintage-badge":
    "Classic badge/crest composition with the text arcing or contained within a frame. Use a serif or slab-serif font. Include decorative border elements, banner ribbons, or shield shapes.",
  "tech-cyberpunk":
    "Futuristic, tech-forward design. Use a monospace or tech-style font. The icon should feature circuit-like patterns, angular glitch forms, or digital/hex motifs.",
  "luxurious-monogram":
    "Elegant monogram design using the brand's initials. Use a refined serif or display serif font. The icon IS the interlocked initials — no separate pictorial icon needed.",
  "3d-isometric":
    "Clean isometric/dimensional design. Use a modern geometric sans-serif font. The icon should be a simple 3D isometric shape — cube, prism, or architectural form rendered as flat SVG paths with shading faces.",
};

const PALETTE_DIRECTIONS: Record<ColorPalette, { primary: string; secondary: string; accent: string; bg: string; text: string }> = {
  vibrant: { primary: "#FF6B35", secondary: "#004E89", accent: "#F7C948", bg: "#FFFFFF", text: "#1A1A2E" },
  monochrome: { primary: "#2D2D2D", secondary: "#6B6B6B", accent: "#A0A0A0", bg: "#FFFFFF", text: "#111111" },
  pastel: { primary: "#B8D8E8", secondary: "#E8C8D8", accent: "#C8E8C8", bg: "#FFF9F5", text: "#3D3D3D" },
  neon: { primary: "#00FF88", secondary: "#FF00FF", accent: "#00CCFF", bg: "#0A0A0A", text: "#FFFFFF" },
  earthy: { primary: "#8B6914", secondary: "#2D5016", accent: "#C4722F", bg: "#FDF8F0", text: "#2C1810" },
  "corporate-blue": { primary: "#1E3A8A", secondary: "#3B82F6", accent: "#60A5FA", bg: "#FFFFFF", text: "#1E293B" },
  "gold-luxury": { primary: "#B8860B", secondary: "#1A1A1A", accent: "#DAA520", bg: "#0D0D0D", text: "#F5F0E8" },
};

/* ------------------------------------------------------------------ */
/* Main structured prompt builder                                       */
/* ------------------------------------------------------------------ */

function buildSvgLogoSystemPrompt(): string {
  return `You are an elite logo designer and brand identity expert. You create professional, production-ready logo designs as structured JSON data.

Your output will be rendered as SVG, so every design decision must be precise and vector-ready.

CRITICAL RULES:
1. All coordinates are in a 500x500 canvas space.
2. SVG paths must be valid, well-formed SVG path data (M, L, C, A, Z commands).
3. Font families MUST be real Google Fonts names (e.g. "Inter", "Montserrat", "Playfair Display", "Space Grotesk", "Bebas Neue", "DM Serif Display", "Raleway", "Poppins", "Outfit", "Oswald", "Lora", "Merriweather", "Source Sans 3", "Roboto Slab", "Archivo Black").
4. All colors must be valid hex codes (e.g. "#FF6B35").
5. Keep icon SVG paths simple and clean — they should look good at any size.
6. Create a BALANCED, PROFESSIONAL composition. Text and icon should be well-positioned and proportioned.
7. For "combination-mark" logos: place the icon centered above or to the left of the text.
8. For "wordmark" logos: focus on typography with stylized letterforms, no separate icon layer needed.
9. For "lettermark" logos: use only initials, similar to wordmark but with 1-3 characters.
10. Each layer MUST have a unique id string.
11. Every layer needs: id, type, label, x, y, width, height, fill, opacity (0-1), rotation (degrees), visible (true), locked (false).
12. Text layers also need: content, fontFamily, fontSize, fontWeight, letterSpacing, textAnchor ("middle" for centered).
13. Icon/shape layers also need: svgPath (valid SVG path data), viewBox (e.g. "0 0 100 100").

Respond with a JSON array of exactly 4 distinct logo concept variations. Each concept is a LogoData object:
{
  "brandName": string,
  "slogan": string or null,
  "logoType": "wordmark" | "icon" | "combination-mark" | "lettermark" | "emblem",
  "colorPalette": [
    { "hex": "#...", "role": "primary" | "secondary" | "accent" | "background" | "text", "label": "Color Name" }
  ],
  "fontRecommendations": [
    { "family": "Font Name", "googleFontsName": "Font+Name", "weight": 700, "role": "heading" | "body" | "accent" }
  ],
  "svgIconMarkup": "<path d='...' />" or null,
  "layers": [ ...LogoLayer objects... ],
  "canvasWidth": 500,
  "canvasHeight": 500,
  "backgroundColor": "#..."
}

Make 4 DISTINCT concepts:
- Concept 1: A combination-mark (icon + text) — the "standard" version
- Concept 2: A wordmark or lettermark — typography-focused
- Concept 3: An emblem or badge style — icon-dominant or enclosed
- Concept 4: A creative/unique variation — surprise the client with something unexpected

Each concept should have different compositions, icon designs, and slight color variations while staying cohesive with the brand's palette and style.`;
}

function buildSvgLogoUserPrompt(params: LogoGenerationParams): string {
  const style = STYLE_DIRECTIONS[params.style] || STYLE_DIRECTIONS.minimalist;
  const palette = PALETTE_DIRECTIONS[params.colorPalette] || PALETTE_DIRECTIONS.monochrome;

  return [
    `Design 4 professional logo concepts for:`,
    `Brand Name: "${params.brandName}"`,
    params.slogan ? `Tagline: "${params.slogan}"` : "",
    `Industry: ${params.industry}`,
    ``,
    `Visual Style Direction: ${style}`,
    ``,
    `Color Palette Guide:`,
    `  Primary: ${palette.primary}`,
    `  Secondary: ${palette.secondary}`,
    `  Accent: ${palette.accent}`,
    `  Background: ${palette.bg}`,
    `  Text: ${palette.text}`,
    ``,
    params.conceptDescription
      ? `Additional concept notes: ${params.conceptDescription}`
      : "",
    ``,
    `Remember: output exactly 4 concepts as a JSON array. Each concept must have well-positioned layers within a 500x500 canvas.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/* ------------------------------------------------------------------ */
/* Public generation function                                           */
/* ------------------------------------------------------------------ */

/**
 * Ask Gemini to produce 4 structured logo concepts as LogoData[].
 *
 * Each concept contains fully positioned layers (text, icon, shapes)
 * ready to be rendered as SVG and edited in the canvas editor.
 */
export async function generateStructuredLogos(
  params: LogoGenerationParams
): Promise<LogoData[]> {
  const system = buildSvgLogoSystemPrompt();
  const user = buildSvgLogoUserPrompt(params);

  const raw = await generateJson<LogoData[]>({
    system,
    user,
    temperature: 0.8,
  });

  // Normalize: ensure we always return an array of 1–4 items
  const concepts = Array.isArray(raw) ? raw : [raw];

  return concepts.slice(0, 4).map((concept, idx) => normalizeConcept(concept, params, idx));
}

/* ------------------------------------------------------------------ */
/* Normalization — bulletproof the AI output                            */
/* ------------------------------------------------------------------ */

function normalizeConcept(
  raw: Partial<LogoData>,
  params: LogoGenerationParams,
  idx: number
): LogoData {
  const palette = PALETTE_DIRECTIONS[params.colorPalette] || PALETTE_DIRECTIONS.monochrome;

  const data: LogoData = {
    brandName: raw.brandName || params.brandName,
    slogan: raw.slogan || params.slogan,
    logoType: raw.logoType || "combination-mark",
    colorPalette: Array.isArray(raw.colorPalette) && raw.colorPalette.length >= 3
      ? raw.colorPalette
      : [
          { hex: palette.primary, role: "primary", label: "Primary" },
          { hex: palette.secondary, role: "secondary", label: "Secondary" },
          { hex: palette.accent, role: "accent", label: "Accent" },
          { hex: palette.bg, role: "background", label: "Background" },
          { hex: palette.text, role: "text", label: "Text" },
        ],
    fontRecommendations: Array.isArray(raw.fontRecommendations) && raw.fontRecommendations.length > 0
      ? raw.fontRecommendations
      : [
          { family: "Inter", googleFontsName: "Inter", weight: 700, role: "heading" as const },
          { family: "Inter", googleFontsName: "Inter", weight: 400, role: "body" as const },
        ],
    svgIconMarkup: raw.svgIconMarkup || undefined,
    layers: [],
    canvasWidth: 500,
    canvasHeight: 500,
    backgroundColor: raw.backgroundColor || palette.bg,
  };

  // If the AI returned layers, normalize each one
  if (Array.isArray(raw.layers) && raw.layers.length > 0) {
    data.layers = raw.layers.map((layer, li) => normalizeLayer(layer, li, data));
  } else {
    // Fallback: construct basic layers from brand name
    data.layers = buildFallbackLayers(data, params, idx);
  }

  return data;
}

function normalizeLayer(
  raw: Partial<import("@/types/logo").LogoLayer>,
  index: number,
  data: LogoData
): import("@/types/logo").LogoLayer {
  const textColor = data.colorPalette.find((c) => c.role === "text")?.hex || "#111111";
  const primaryColor = data.colorPalette.find((c) => c.role === "primary")?.hex || "#333333";

  return {
    id: raw.id || `layer-${index}`,
    type: raw.type || "text",
    label: raw.label || `Layer ${index + 1}`,
    content: raw.content,
    svgPath: raw.svgPath,
    viewBox: raw.viewBox || "0 0 100 100",
    x: typeof raw.x === "number" ? raw.x : 250,
    y: typeof raw.y === "number" ? raw.y : 250,
    width: typeof raw.width === "number" ? raw.width : 200,
    height: typeof raw.height === "number" ? raw.height : 60,
    fill: raw.fill || (raw.type === "text" ? textColor : primaryColor),
    stroke: raw.stroke,
    strokeWidth: raw.strokeWidth,
    fontFamily: raw.fontFamily || data.fontRecommendations[0]?.family || "Inter",
    fontSize: typeof raw.fontSize === "number" ? raw.fontSize : 48,
    fontWeight: typeof raw.fontWeight === "number" ? raw.fontWeight : 700,
    letterSpacing: typeof raw.letterSpacing === "number" ? raw.letterSpacing : 0,
    textAnchor: raw.textAnchor || "middle",
    opacity: typeof raw.opacity === "number" ? raw.opacity : 1,
    rotation: typeof raw.rotation === "number" ? raw.rotation : 0,
    visible: raw.visible !== false,
    locked: raw.locked === true,
  };
}

/** Construct minimal layers when the AI fails to produce proper layer data */
function buildFallbackLayers(
  data: LogoData,
  params: LogoGenerationParams,
  conceptIndex: number
): import("@/types/logo").LogoLayer[] {
  const textColor = data.colorPalette.find((c) => c.role === "text")?.hex || "#111111";
  const primaryColor = data.colorPalette.find((c) => c.role === "primary")?.hex || "#333333";
  const headingFont = data.fontRecommendations.find((f) => f.role === "heading");

  const layers: import("@/types/logo").LogoLayer[] = [];

  // Brand name text
  layers.push({
    id: `text-brand-${conceptIndex}`,
    type: "text",
    label: "Brand Name",
    content: params.brandName,
    x: 250,
    y: data.logoType === "wordmark" || data.logoType === "lettermark" ? 260 : 350,
    width: 400,
    height: 60,
    fill: textColor,
    fontFamily: headingFont?.family || "Inter",
    fontSize: data.logoType === "lettermark" ? 72 : 42,
    fontWeight: headingFont?.weight || 700,
    letterSpacing: 2,
    textAnchor: "middle",
    opacity: 1,
    rotation: 0,
    visible: true,
    locked: false,
  });

  // Slogan text (if exists)
  if (params.slogan) {
    const bodyFont = data.fontRecommendations.find((f) => f.role === "body");
    layers.push({
      id: `text-slogan-${conceptIndex}`,
      type: "text",
      label: "Tagline",
      content: params.slogan,
      x: 250,
      y: data.logoType === "wordmark" || data.logoType === "lettermark" ? 310 : 395,
      width: 350,
      height: 30,
      fill: textColor,
      fontFamily: bodyFont?.family || "Inter",
      fontSize: 16,
      fontWeight: 400,
      letterSpacing: 3,
      textAnchor: "middle",
      opacity: 0.7,
      rotation: 0,
      visible: true,
      locked: false,
    });
  }

  // Default icon shape (simple circle + inner shape)
  if (data.logoType !== "wordmark" && data.logoType !== "lettermark") {
    layers.push({
      id: `icon-main-${conceptIndex}`,
      type: "icon",
      label: "Icon",
      svgPath: "M50 5 A45 45 0 1 0 50 95 A45 45 0 1 0 50 5 Z M50 25 L65 45 H55 V70 H45 V45 H35 Z",
      viewBox: "0 0 100 100",
      x: 250,
      y: 180,
      width: 140,
      height: 140,
      fill: primaryColor,
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
    });
  }

  return layers;
}
