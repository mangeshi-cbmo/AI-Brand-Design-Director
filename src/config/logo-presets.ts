import { LogoStyle, ColorPalette } from "@/types/logo";

export interface StyleOption {
  id: LogoStyle;
  label: string;
  description: string;
  badge?: string;
}

export interface PaletteOption {
  id: ColorPalette;
  label: string;
  colors: string[];
}

export const LOGO_STYLES: StyleOption[] = [
  { id: "minimalist", label: "Minimalist", description: "Clean lines, simple iconic silhouettes" },
  { id: "modern-gradient", label: "Modern Gradient", description: "Vibrant smooth color transitions", badge: "Popular" },
  { id: "abstract-geometric", label: "Geometric", description: "Symmetrical balanced mathematical shapes" },
  { id: "mascot-character", label: "Mascot", description: "Illustrative character and gaming badge style" },
  { id: "vintage-badge", label: "Vintage Heritage", description: "Retro typography with crafted stamp frames" },
  { id: "tech-cyberpunk", label: "Tech / Cyber", description: "Futuristic digital circuits & neon aesthetics" },
  { id: "luxurious-monogram", label: "Luxury Monogram", description: "Intertwined elegant serif initials", badge: "Premium" },
  { id: "3d-isometric", label: "3D Isometric", description: "Rendered 3D objects with depth and shadows" },
];

export const COLOR_PALETTES: PaletteOption[] = [
  { id: "vibrant", label: "Vibrant", colors: ["#6366F1", "#EC4899", "#3B82F6"] },
  { id: "monochrome", label: "Monochrome", colors: ["#000000", "#4B5563", "#FFFFFF"] },
  { id: "neon", label: "Cyber Neon", colors: ["#06B6D4", "#10B981", "#F43F5E"] },
  { id: "pastel", label: "Soft Pastel", colors: ["#FDE68A", "#FBCFE8", "#A7F3D0"] },
  { id: "corporate-blue", label: "Corporate Blue", colors: ["#1E3A8A", "#2563EB", "#93C5FD"] },
  { id: "gold-luxury", label: "Gold & Charcoal", colors: ["#D97706", "#F59E0B", "#18181B"] },
  { id: "earthy", label: "Earthy Natural", colors: ["#15803D", "#B45309", "#78350F"] },
];

export const INDUSTRIES = [
  "Technology & AI",
  "E-commerce & Retail",
  "Finance & Crypto",
  "Health & Wellness",
  "Food & Beverage",
  "Fashion & Apparel",
  "Gaming & Entertainment",
  "Real Estate & Architecture",
  "Education & Consulting",
];
