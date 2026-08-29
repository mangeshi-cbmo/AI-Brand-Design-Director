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

/** The structural category of the logo mark */
export type LogoType =
  | "wordmark"
  | "icon"
  | "combination-mark"
  | "lettermark"
  | "emblem";

/** A single editable element within the logo composition */
export interface LogoLayer {
  id: string;
  type: "text" | "icon" | "shape";
  /** Display label shown in the layers panel */
  label: string;
  /** Text content (for text layers) */
  content?: string;
  /** SVG path data (for icon/shape layers) */
  svgPath?: string;
  /** Viewport box for the SVG path (e.g. "0 0 100 100") */
  viewBox?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  textAnchor?: "start" | "middle" | "end";
  opacity: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
}

/** A color swatch within the logo's palette */
export interface LogoPaletteColor {
  hex: string;
  role: "primary" | "secondary" | "accent" | "background" | "text";
  label: string;
}

/** Font recommendation for the logo */
export interface LogoFont {
  family: string;
  /** Google Fonts-compatible name for dynamic loading */
  googleFontsName: string;
  weight: number;
  role: "heading" | "body" | "accent";
}

/** Complete structured logo data — the core of the editable system */
export interface LogoData {
  brandName: string;
  slogan?: string;
  logoType: LogoType;
  colorPalette: LogoPaletteColor[];
  fontRecommendations: LogoFont[];
  /** Raw SVG markup for the icon element (if any) */
  svgIconMarkup?: string;
  layers: LogoLayer[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
}

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
  /** Structured editable logo data (new SVG system) */
  logoData?: LogoData;
  style: LogoStyle;
  colorPalette: ColorPalette;
  promptUsed: string;
  createdAt: Date;
  isFavorite?: boolean;
}
