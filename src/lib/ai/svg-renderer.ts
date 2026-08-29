import { LogoData, LogoLayer } from "@/types/logo";

export interface RenderSvgOptions {
  transparentBg?: boolean;
  iconOnly?: boolean;
  onLight?: boolean;
  onDark?: boolean;
  forceColor?: string;
  width?: number;
  height?: number;
}

/**
 * Render a LogoData structure into a complete, clean SVG string.
 *
 * Supports transparent backgrounds, icon-only extraction, and surface
 * adaptation (light/dark surfaces) for brand guidelines and lockups.
 */
export function renderLogoDataToSvg(data: LogoData, options: RenderSvgOptions = {}): string {
  const {
    transparentBg = false,
    iconOnly = false,
    onLight = false,
    onDark = false,
    width,
    height,
  } = options;

  let activeLayers = data.layers.filter((l) => l.visible);

  if (iconOnly) {
    const iconLayers = activeLayers.filter((l) => l.type === "icon" || l.type === "shape");
    if (iconLayers.length > 0) {
      activeLayers = iconLayers;
    }
  }

  // Determine viewBox and dimensions
  let vx = 0;
  let vy = 0;
  let vw = data.canvasWidth || 500;
  let vh = data.canvasHeight || 500;

  // When rendering icon-only, zoom and center onto the icon layers tightly
  if (iconOnly && activeLayers.length > 0) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    activeLayers.forEach((l) => {
      const halfW = (l.width || 100) / 2;
      const halfH = (l.height || 100) / 2;
      minX = Math.min(minX, l.x - halfW);
      minY = Math.min(minY, l.y - halfH);
      maxX = Math.max(maxX, l.x + halfW);
      maxY = Math.max(maxY, l.y + halfH);
    });

    if (minX !== Infinity && maxX !== -Infinity) {
      const boxW = Math.max(10, maxX - minX);
      const boxH = Math.max(10, maxY - minY);
      const size = Math.max(boxW, boxH);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const pad = size * 0.12; // 12% padding

      vx = cx - size / 2 - pad;
      vy = cy - size / 2 - pad;
      vw = size + pad * 2;
      vh = size + pad * 2;
    }
  }

  const outWidth = width || (iconOnly ? 200 : vw);
  const outHeight = height || (iconOnly ? 200 : vh);

  const defs = buildFontImports(data);
  const layerSvg = activeLayers
    .map((l) => renderLayer(l, { onLight, onDark, forceColor: options.forceColor }))
    .join("\n    ");

  const bgRect = transparentBg
    ? ""
    : `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${data.backgroundColor || "#FFFFFF"}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${outWidth}" height="${outHeight}">
  ${defs}
  ${bgRect}
  <g>
    ${layerSvg}
  </g>
</svg>`;
}

/**
 * Render specifically the icon mark of a logo with transparent background,
 * tightly fitted and centered.
 */
export function renderLogoIconSvg(data: LogoData, options: Omit<RenderSvgOptions, "iconOnly"> = {}): string {
  return renderLogoDataToSvg(data, {
    ...options,
    iconOnly: true,
    transparentBg: true,
  });
}

/**
 * Render LogoData to a base64 data-URL suitable for <img src> and
 * backward-compatible with the existing `imageUrl` pipeline.
 */
export function renderLogoDataToDataUrl(data: LogoData, options: RenderSvgOptions = {}): string {
  const svg = renderLogoDataToSvg(data, options);
  const encoded = typeof btoa === "function"
    ? btoa(unescape(encodeURIComponent(svg)))
    : Buffer.from(svg, "utf-8").toString("base64");
  return `data:image/svg+xml;base64,${encoded}`;
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                      */
/* ------------------------------------------------------------------ */

function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length < 3) return false;
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return false;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  // Perceived brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 180;
}

function buildFontImports(data: LogoData): string {
  const families = new Set<string>();

  data.fontRecommendations?.forEach((f) => {
    if (f.googleFontsName) families.add(f.googleFontsName);
  });
  data.layers?.forEach((l) => {
    if (l.type === "text" && l.fontFamily) {
      families.add(l.fontFamily.replace(/\s+/g, "+"));
    }
  });

  if (families.size === 0) return "";

  const importUrl = `https://fonts.googleapis.com/css2?${[...families]
    .map((f) => `family=${f}:wght@300;400;500;600;700;800;900`)
    .join("&")}&display=swap`;

  return `<defs>
    <style>@import url('${importUrl}');</style>
  </defs>`;
}

function resolveFillColor(
  originalFill: string,
  options: { onLight?: boolean; onDark?: boolean; forceColor?: string }
): string {
  if (options.forceColor) return options.forceColor;

  if (options.onLight) {
    // If on light surface and the color is white/near-white, darken it
    if (isLightColor(originalFill)) {
      return "#111827";
    }
  }

  if (options.onDark) {
    // If on dark surface and the color is black/near-black, lighten it
    if (!isLightColor(originalFill)) {
      return "#F9FAFB";
    }
  }

  return originalFill;
}

function renderLayer(
  layer: LogoLayer,
  options: { onLight?: boolean; onDark?: boolean; forceColor?: string }
): string {
  const transform = buildTransform(layer);
  const transformAttr = transform ? ` transform="${transform}"` : "";
  const opacityAttr = layer.opacity < 1 ? ` opacity="${layer.opacity}"` : "";
  const fill = resolveFillColor(layer.fill, options);

  switch (layer.type) {
    case "text":
      return renderTextLayer(layer, fill, transformAttr, opacityAttr);
    case "icon":
    case "shape":
      return renderPathLayer(layer, fill, transformAttr, opacityAttr);
    default:
      return "";
  }
}

function renderTextLayer(
  layer: LogoLayer,
  fill: string,
  transformAttr: string,
  opacityAttr: string
): string {
  const fontFamily = layer.fontFamily || "Inter";
  const fontSize = layer.fontSize || 48;
  const fontWeight = layer.fontWeight || 700;
  const letterSpacing = layer.letterSpacing || 0;
  const anchor = layer.textAnchor || "middle";
  const content = escapeXml(layer.content || "");

  const textX = anchor === "middle" ? layer.x : layer.x - layer.width / 2;
  const textY = layer.y + fontSize * 0.35;

  const strokeAttr = layer.stroke
    ? ` stroke="${layer.stroke}" stroke-width="${layer.strokeWidth || 1}"`
    : "";

  return `<text x="${textX}" y="${textY}" fill="${fill}" font-family="'${fontFamily}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}" text-anchor="${anchor}" dominant-baseline="central"${strokeAttr}${opacityAttr}${transformAttr}>${content}</text>`;
}

function renderPathLayer(
  layer: LogoLayer,
  fill: string,
  transformAttr: string,
  opacityAttr: string
): string {
  if (!layer.svgPath) return "";

  const viewBox = layer.viewBox || "0 0 100 100";
  const [, , vbW, vbH] = viewBox.split(" ").map(Number);
  const scaleX = layer.width / (vbW || 100);
  const scaleY = layer.height / (vbH || 100);
  const translateX = layer.x - layer.width / 2;
  const translateY = layer.y - layer.height / 2;

  const pathTransform = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;

  const strokeAttr = layer.stroke
    ? ` stroke="${layer.stroke}" stroke-width="${(layer.strokeWidth || 1) / Math.min(scaleX, scaleY)}"`
    : "";

  return `<g${opacityAttr}${transformAttr}><path d="${layer.svgPath}" fill="${fill}"${strokeAttr} transform="${pathTransform}" /></g>`;
}

function buildTransform(layer: LogoLayer): string {
  if (layer.rotation === 0) return "";
  return `rotate(${layer.rotation}, ${layer.x}, ${layer.y})`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
