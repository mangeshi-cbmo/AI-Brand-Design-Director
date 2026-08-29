/**
 * Dynamic Google Fonts loader for the SVG logo editor.
 *
 * Loads fonts on-demand via the Google Fonts CSS API and caches them
 * so repeated renders of the same logo don't trigger extra requests.
 */

const loadedFonts = new Set<string>();

/** Curated list of premium Google Fonts suitable for logo design */
export const LOGO_FONTS = [
  // Modern sans-serif
  { name: "Inter", value: "Inter" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Poppins", value: "Poppins" },
  { name: "Raleway", value: "Raleway" },
  { name: "Space Grotesk", value: "Space Grotesk" },
  { name: "Outfit", value: "Outfit" },
  { name: "Manrope", value: "Manrope" },
  { name: "Sora", value: "Sora" },
  { name: "DM Sans", value: "DM Sans" },
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans" },
  // Bold / Display sans
  { name: "Bebas Neue", value: "Bebas Neue" },
  { name: "Archivo Black", value: "Archivo Black" },
  { name: "Oswald", value: "Oswald" },
  { name: "Anton", value: "Anton" },
  { name: "Barlow Condensed", value: "Barlow Condensed" },
  // Serif / Display serif
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "DM Serif Display", value: "DM Serif Display" },
  { name: "Lora", value: "Lora" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Roboto Slab", value: "Roboto Slab" },
  { name: "Source Serif 4", value: "Source Serif 4" },
  { name: "Cormorant Garamond", value: "Cormorant Garamond" },
  // Geometric / Unique
  { name: "Righteous", value: "Righteous" },
  { name: "Comfortaa", value: "Comfortaa" },
  { name: "Fredoka", value: "Fredoka" },
  { name: "Quicksand", value: "Quicksand" },
  // Monospace / Tech
  { name: "JetBrains Mono", value: "JetBrains Mono" },
  { name: "Source Code Pro", value: "Source Code Pro" },
  { name: "Fira Code", value: "Fira Code" },
  // Script / Cursive
  { name: "Dancing Script", value: "Dancing Script" },
  { name: "Pacifico", value: "Pacifico" },
  { name: "Great Vibes", value: "Great Vibes" },
] as const;

/**
 * Load a Google Font by name. Safe to call multiple times — already-loaded
 * fonts are skipped. Returns a promise that resolves when the font is ready.
 */
export async function loadGoogleFont(fontFamily: string): Promise<void> {
  if (typeof document === "undefined") return; // SSR guard
  if (loadedFonts.has(fontFamily)) return;

  const encoded = fontFamily.replace(/\s+/g, "+");
  const url = `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700;800;900&display=swap`;

  // Check if already in the DOM
  const existing = document.querySelector(`link[href="${url}"]`);
  if (existing) {
    loadedFonts.add(fontFamily);
    return;
  }

  return new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => {
      loadedFonts.add(fontFamily);
      resolve();
    };
    link.onerror = () => {
      console.warn(`Failed to load Google Font: ${fontFamily}`);
      loadedFonts.add(fontFamily); // Don't retry
      reject(new Error(`Font load failed: ${fontFamily}`));
    };
    document.head.appendChild(link);
  });
}

/**
 * Load all fonts referenced by a logo's layers and font recommendations.
 */
export async function loadLogoFonts(
  layers: { fontFamily?: string }[],
  fontRecommendations?: { family: string }[]
): Promise<void> {
  const families = new Set<string>();

  layers.forEach((l) => {
    if (l.fontFamily) families.add(l.fontFamily);
  });
  fontRecommendations?.forEach((f) => {
    if (f.family) families.add(f.family);
  });

  await Promise.allSettled([...families].map(loadGoogleFont));
}
