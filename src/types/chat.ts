import { GeneratedLogo, LogoStyle, ColorPalette } from "./logo";
import { BrandGuidelines } from "./brand";

export type MessageRole = "assistant" | "user" | "system";

export interface QuickOption {
  label: string;
  value: string;
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  quickOptions?: QuickOption[];
  isThinking?: boolean;
  generatedLogo?: GeneratedLogo;
  /** All concepts from this generation (the primary is generatedLogo) */
  generatedLogos?: GeneratedLogo[];
  brandGuidelines?: BrandGuidelines;
  collectedData?: {
    brandName?: string;
    industry?: string;
    style?: LogoStyle;
    colorPalette?: ColorPalette;
    concept?: string;
    slogan?: string;
  };
}
