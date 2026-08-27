import { z } from "zod";

export const generateLogoSchema = z.object({
  brandName: z.string().min(1, "Brand name is required").max(50, "Brand name is too long"),
  slogan: z.string().max(100).optional(),
  industry: z.string().min(1, "Industry is required").max(50),
  style: z.enum([
    "minimalist",
    "modern-gradient",
    "abstract-geometric",
    "mascot-character",
    "vintage-badge",
    "tech-cyberpunk",
    "luxurious-monogram",
    "3d-isometric",
  ]),
  colorPalette: z.enum([
    "vibrant",
    "monochrome",
    "pastel",
    "neon",
    "earthy",
    "corporate-blue",
    "gold-luxury",
  ]),
  conceptDescription: z.string().max(500).optional(),
});

export type GenerateLogoInput = z.infer<typeof generateLogoSchema>;
