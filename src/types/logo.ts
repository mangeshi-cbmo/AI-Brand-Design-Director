export type LogoStyle = 
  | "minimalist"
  | "modern-gradient"
  | "abstract-geometric"
  | "mascot-character"
  | "vintage-badge"
  | "tech-cyberpunk"
  | "luxurious-monogram"
  | "3d-isometric";

export type ColorPalette = 
  | "vibrant"
  | "monochrome"
  | "pastel"
  | "neon"
  | "earthy"
  | "corporate-blue"
  | "gold-luxury";

export interface LogoGenerationParams {
  brandName: string;
  slogan?: string;
  industry: string;
  style: LogoStyle;
  colorPalette: ColorPalette;
  conceptDescription?: string;
}

export interface GeneratedLogo {
  id: string;
  brandName: string;
  imageUrl: string;
  svgData?: string;
  style: LogoStyle;
  colorPalette: ColorPalette;
  promptUsed: string;
  createdAt: Date;
  isFavorite?: boolean;
}
