import { BrandColor, BrandTypeface } from "@/types/brand";
import { ColorPalette, LogoStyle } from "@/types/logo";

/*
 * Deterministic building blocks of the brand guidelines template.
 * Colors and typography are fixed per palette/style choice — never
 * AI-generated — which guarantees a consistent document every time.
 */

const ROLE_USAGE: Record<BrandColor["role"], string> = {
  Primary: "Logo mark & key brand moments",
  Secondary: "Supporting elements & links",
  Accent: "Highlights & calls-to-action",
  "Neutral Dark": "Text & dark surfaces",
  "Neutral Light": "Backgrounds & negative space",
};

function swatch(name: string, hex: string, role: BrandColor["role"]): BrandColor {
  return { name, hex, role, usage: ROLE_USAGE[role] };
}

export const PALETTE_GUIDE: Record<ColorPalette, [BrandColor, BrandColor, BrandColor, BrandColor, BrandColor]> = {
  vibrant: [
    swatch("Rose Pulse", "#f43f5e", "Primary"),
    swatch("Azure Drive", "#3b82f6", "Secondary"),
    swatch("Amber Surge", "#f59e0b", "Accent"),
    swatch("Ink", "#111827", "Neutral Dark"),
    swatch("Cloud", "#fafafa", "Neutral Light"),
  ],
  monochrome: [
    swatch("Pure White", "#ffffff", "Primary"),
    swatch("Silver Mist", "#a3a3a3", "Secondary"),
    swatch("Graphite", "#525252", "Accent"),
    swatch("Carbon Black", "#0a0a0a", "Neutral Dark"),
    swatch("Paper", "#f5f5f5", "Neutral Light"),
  ],
  pastel: [
    swatch("Blush", "#fbcfe8", "Primary"),
    swatch("Powder Blue", "#bfdbfe", "Secondary"),
    swatch("Fresh Mint", "#bbf7d0", "Accent"),
    swatch("Soft Slate", "#334155", "Neutral Dark"),
    swatch("Cream", "#fefce8", "Neutral Light"),
  ],
  neon: [
    swatch("Cyan Glow", "#22d3ee", "Primary"),
    swatch("Magenta Flux", "#e879f9", "Secondary"),
    swatch("Lime Volt", "#a3e635", "Accent"),
    swatch("Void Black", "#09090b", "Neutral Dark"),
    swatch("Frost", "#f0fdfa", "Neutral Light"),
  ],
  earthy: [
    swatch("Ochre", "#a16207", "Primary"),
    swatch("Forest", "#166534", "Secondary"),
    swatch("Moss", "#84cc16", "Accent"),
    swatch("Espresso", "#292524", "Neutral Dark"),
    swatch("Stone", "#f5f5f4", "Neutral Light"),
  ],
  "corporate-blue": [
    swatch("Royal Navy", "#1e3a8a", "Primary"),
    swatch("Cobalt", "#3b82f6", "Secondary"),
    swatch("Sky Silver", "#93c5fd", "Accent"),
    swatch("Midnight", "#0f172a", "Neutral Dark"),
    swatch("Ice White", "#f8fafc", "Neutral Light"),
  ],
  "gold-luxury": [
    swatch("Gold Foil", "#fbbf24", "Primary"),
    swatch("Aged Bronze", "#b45309", "Secondary"),
    swatch("Champagne", "#fde68a", "Accent"),
    swatch("Onyx", "#111111", "Neutral Dark"),
    swatch("Ivory", "#faf9f6", "Neutral Light"),
  ],
};

export const TYPE_PAIRINGS: Record<LogoStyle, { heading: BrandTypeface; body: BrandTypeface }> = {
  minimalist: {
    heading: { family: "Inter", css: "Inter, 'Helvetica Neue', Arial, sans-serif", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Inter", css: "Inter, 'Helvetica Neue', Arial, sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "modern-gradient": {
    heading: { family: "Trebuchet MS", css: "'Trebuchet MS', 'Segoe UI', sans-serif", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Verdana", css: "Verdana, 'Segoe UI', sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "abstract-geometric": {
    heading: { family: "Century Gothic", css: "'Century Gothic', Futura, 'Trebuchet MS', sans-serif", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Inter", css: "Inter, Arial, sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "mascot-character": {
    heading: { family: "Arial Black", css: "'Arial Black', Impact, sans-serif", weight: "900 Black", usage: "Wordmark, headlines & titles" },
    body: { family: "Verdana", css: "Verdana, Arial, sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "vintage-badge": {
    heading: { family: "Georgia", css: "Georgia, 'Times New Roman', serif", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Palatino", css: "'Palatino Linotype', Palatino, Georgia, serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "tech-cyberpunk": {
    heading: { family: "Consolas", css: "Consolas, 'Courier New', monospace", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Segoe UI", css: "'Segoe UI', Roboto, Arial, sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "luxurious-monogram": {
    heading: { family: "Didot / Bodoni", css: "Didot, 'Bodoni MT', 'Playfair Display', Georgia, serif", weight: "700 Bold", usage: "Wordmark, headlines & titles" },
    body: { family: "Georgia", css: "Georgia, 'Times New Roman', serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
  "3d-isometric": {
    heading: { family: "Segoe UI", css: "'Segoe UI', 'Helvetica Neue', sans-serif", weight: "800 ExtraBold", usage: "Wordmark, headlines & titles" },
    body: { family: "Segoe UI", css: "'Segoe UI', Arial, sans-serif", weight: "400 Regular", usage: "Body copy, captions & UI text" },
  },
};

/* Narrative fallbacks — used verbatim if the LLM fill fails, so the
 * guidelines document is ALWAYS complete. */
export const FALLBACK_PERSONALITY: [string, string, string, string] = [
  "Confident",
  "Modern",
  "Trustworthy",
  "Distinctive",
];

export const FALLBACK_DOS: [string, string, string, string] = [
  "Use the provided lockups exactly as designed",
  "Maintain the minimum clear space around the mark",
  "Use only the approved brand color palette",
  "Scale the logo proportionally from a corner handle",
];

export const FALLBACK_DONTS: [string, string, string, string] = [
  "Do not stretch, skew, or distort the mark",
  "Do not recolor the logo outside the palette",
  "Do not add drop shadows, outlines, or effects",
  "Do not place the mark on low-contrast backgrounds",
];

export function fallbackStory(brandName: string, industry: string, concept?: string): string {
  return `${brandName} is a ${industry.toLowerCase()} brand built around ${
    concept ? concept.toLowerCase() : "a distinctive visual identity"
  }. Its mark balances clarity with character, designed to stay instantly recognizable across every touchpoint — from app icon to storefront.`;
}

export function hexToRgb(hex: string): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}
