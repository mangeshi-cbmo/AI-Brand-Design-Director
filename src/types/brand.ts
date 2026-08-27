import { ColorPalette, LogoStyle } from "./logo";

/**
 * Fixed brand guidelines template.
 *
 * Every generation fills this EXACT structure — same sections, same field
 * counts — so the rendered guidelines document is always consistent:
 *   01 Brand Overview   (story + exactly 4 personality traits)
 *   02 Logo Suite       (horizontal / stacked / icon-only / on-light lockups)
 *   03 Clear Space      (static construction rules)
 *   04 Color Palette    (exactly 5 swatches: primary, secondary, accent, dark, light)
 *   05 Typography       (heading + body pairing)
 *   06 Usage Rules      (exactly 4 do's + exactly 4 don'ts)
 */

export interface BrandColor {
  name: string;
  hex: string;
  role: "Primary" | "Secondary" | "Accent" | "Neutral Dark" | "Neutral Light";
  usage: string;
}

export interface BrandTypeface {
  family: string;
  css: string;
  weight: string;
  usage: string;
}

export interface BrandGuidelines {
  brandName: string;
  slogan: string;
  industry: string;
  style: LogoStyle;
  colorPalette: ColorPalette;
  story: string;
  personality: [string, string, string, string];
  colors: [BrandColor, BrandColor, BrandColor, BrandColor, BrandColor];
  typography: {
    heading: BrandTypeface;
    body: BrandTypeface;
  };
  dos: [string, string, string, string];
  donts: [string, string, string, string];
}
