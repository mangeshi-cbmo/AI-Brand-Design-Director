import * as fabric from "fabric";

/* ------------------------------------------------------------------ */
/* Types & constants                                                    */
/* ------------------------------------------------------------------ */

export type ShapeKind =
  | "square"
  | "rect"
  | "rounded"
  | "circle"
  | "ellipse"
  | "triangle"
  | "right-triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "star4"
  | "heart"
  | "arrow"
  | "line"
  | "dashed-line"
  | "ring"
  | "cross"
  | "parallelogram"
  | "trapezoid"
  | "bubble"
  | "frame";

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export const FONTS = [
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Arial", value: "Arial, sans-serif" },
  { name: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { name: "Verdana", value: "Verdana, sans-serif" },
  { name: "Tahoma", value: "Tahoma, sans-serif" },
  { name: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { name: "Impact", value: "Impact, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
  { name: "Times New Roman", value: "'Times New Roman', serif" },
  { name: "Garamond", value: "Garamond, serif" },
  { name: "Palatino", value: "'Palatino Linotype', Palatino, serif" },
  { name: "Courier New", value: "'Courier New', monospace" },
  { name: "Lucida Console", value: "'Lucida Console', monospace" },
  { name: "Brush Script", value: "'Brush Script MT', cursive" },
  { name: "Comic Sans", value: "'Comic Sans MS', cursive" },
];

export const SWATCHES = [
  "#ffffff",
  "#d4d4d4",
  "#737373",
  "#262626",
  "#000000",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
];

export const CANVAS_PRESETS = [
  { label: "Logo 500 × 500", w: 500, h: 500 },
  { label: "Social 1080 × 1080", w: 1080, h: 1080 },
  { label: "Story 1080 × 1920", w: 1080, h: 1920 },
  { label: "Banner 1500 × 500", w: 1500, h: 500 },
  { label: "HD 1280 × 720", w: 1280, h: 720 },
  { label: "Full HD 1920 × 1080", w: 1920, h: 1080 },
];

export const BG_GRADIENTS: { id: string; stops: [string, string] }[] = [
  { id: "midnight", stops: ["#0f172a", "#312e81"] },
  { id: "sunset", stops: ["#f97316", "#db2777"] },
  { id: "ocean", stops: ["#0ea5e9", "#2dd4bf"] },
  { id: "forest", stops: ["#065f46", "#84cc16"] },
  { id: "candy", stops: ["#a855f7", "#f472b6"] },
  { id: "steel", stops: ["#111111", "#525252"] },
  { id: "gold", stops: ["#b45309", "#fde047"] },
  { id: "aurora", stops: ["#22d3ee", "#a78bfa"] },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

export function makeLinearGradient(w: number, h: number, stops: [string, string]) {
  return new fabric.Gradient({
    type: "linear",
    gradientUnits: "pixels",
    coords: { x1: 0, y1: 0, x2: w, y2: h },
    colorStops: [
      { offset: 0, color: stops[0] },
      { offset: 1, color: stops[1] },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Shape factories                                                      */
/* ------------------------------------------------------------------ */

function regularPolygonPoints(sides: number, radius: number) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
}

function starPoints(spikes: number, outer: number, inner: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / spikes - Math.PI / 2;
    pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
  }
  return pts;
}

const HEART_PATH =
  "M 50 88 C 20 62 0 44 0 26 C 0 10 12 0 26 0 C 36 0 45 6 50 15 C 55 6 64 0 74 0 C 88 0 100 10 100 26 C 100 44 80 62 50 88 Z";

const BUBBLE_PATH =
  "M 12 0 H 108 Q 120 0 120 12 V 62 Q 120 74 108 74 H 48 L 26 94 L 31 74 H 12 Q 0 74 0 62 V 12 Q 0 0 12 0 Z";

export function createShape(kind: ShapeKind, style: ShapeStyle): fabric.FabricObject {
  const base = {
    originX: "center" as const,
    originY: "center" as const,
    fill: style.fill,
    stroke: style.strokeWidth > 0 ? style.stroke : undefined,
    strokeWidth: style.strokeWidth,
    strokeUniform: true,
  };

  switch (kind) {
    case "square":
      return new fabric.Rect({ ...base, width: 120, height: 120 });
    case "rect":
      return new fabric.Rect({ ...base, width: 160, height: 100 });
    case "rounded":
      return new fabric.Rect({ ...base, width: 150, height: 110, rx: 20, ry: 20 });
    case "circle":
      return new fabric.Circle({ ...base, radius: 65 });
    case "ellipse":
      return new fabric.Ellipse({ ...base, rx: 85, ry: 55 });
    case "triangle":
      return new fabric.Triangle({ ...base, width: 130, height: 115 });
    case "right-triangle":
      return new fabric.Polygon(
        [
          { x: 0, y: 0 },
          { x: 0, y: 120 },
          { x: 120, y: 120 },
        ],
        base
      );
    case "diamond":
      return new fabric.Polygon(
        [
          { x: 65, y: 0 },
          { x: 130, y: 65 },
          { x: 65, y: 130 },
          { x: 0, y: 65 },
        ],
        base
      );
    case "pentagon":
      return new fabric.Polygon(regularPolygonPoints(5, 68), base);
    case "hexagon":
      return new fabric.Polygon(regularPolygonPoints(6, 68), base);
    case "octagon":
      return new fabric.Polygon(regularPolygonPoints(8, 68), base);
    case "star":
      return new fabric.Polygon(starPoints(5, 70, 30), base);
    case "star4":
      return new fabric.Polygon(starPoints(4, 70, 26), base);
    case "heart":
      return new fabric.Path(HEART_PATH, { ...base, scaleX: 1.3, scaleY: 1.3 });
    case "arrow":
      return new fabric.Polygon(
        [
          { x: 0, y: 32 },
          { x: 72, y: 32 },
          { x: 72, y: 8 },
          { x: 124, y: 48 },
          { x: 72, y: 88 },
          { x: 72, y: 64 },
          { x: 0, y: 64 },
        ],
        base
      );
    case "line":
      return new fabric.Polyline(
        [
          { x: 0, y: 0 },
          { x: 180, y: 0 },
        ],
        {
          ...base,
          fill: undefined,
          stroke: style.fill,
          strokeWidth: Math.max(3, style.strokeWidth),
        }
      );
    case "dashed-line":
      return new fabric.Polyline(
        [
          { x: 0, y: 0 },
          { x: 180, y: 0 },
        ],
        {
          ...base,
          fill: undefined,
          stroke: style.fill,
          strokeWidth: Math.max(3, style.strokeWidth),
          strokeDashArray: [10, 8],
        }
      );
    case "ring":
      return new fabric.Circle({
        ...base,
        radius: 58,
        fill: "transparent",
        stroke: style.fill,
        strokeWidth: 18,
      });
    case "cross":
      return new fabric.Polygon(
        [
          { x: 44, y: 0 },
          { x: 84, y: 0 },
          { x: 84, y: 44 },
          { x: 128, y: 44 },
          { x: 128, y: 84 },
          { x: 84, y: 84 },
          { x: 84, y: 128 },
          { x: 44, y: 128 },
          { x: 44, y: 84 },
          { x: 0, y: 84 },
          { x: 0, y: 44 },
          { x: 44, y: 44 },
        ],
        base
      );
    case "parallelogram":
      return new fabric.Polygon(
        [
          { x: 35, y: 0 },
          { x: 160, y: 0 },
          { x: 125, y: 95 },
          { x: 0, y: 95 },
        ],
        base
      );
    case "trapezoid":
      return new fabric.Polygon(
        [
          { x: 35, y: 0 },
          { x: 125, y: 0 },
          { x: 160, y: 95 },
          { x: 0, y: 95 },
        ],
        base
      );
    case "bubble":
      return new fabric.Path(BUBBLE_PATH, { ...base, scaleX: 1.2, scaleY: 1.2 });
    case "frame":
      return new fabric.Rect({
        ...base,
        width: 440,
        height: 440,
        fill: "transparent",
        stroke: style.fill,
        strokeWidth: Math.max(2, style.strokeWidth),
        rx: 16,
        ry: 16,
      });
  }
}

export const SHAPE_LIBRARY: { kind: ShapeKind; label: string }[] = [
  { kind: "square", label: "Square" },
  { kind: "rect", label: "Rectangle" },
  { kind: "rounded", label: "Rounded" },
  { kind: "circle", label: "Circle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "triangle", label: "Triangle" },
  { kind: "right-triangle", label: "Right Tri" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "octagon", label: "Octagon" },
  { kind: "star", label: "Star" },
  { kind: "star4", label: "Sparkle" },
  { kind: "heart", label: "Heart" },
  { kind: "arrow", label: "Arrow" },
  { kind: "cross", label: "Cross" },
  { kind: "line", label: "Line" },
  { kind: "dashed-line", label: "Dashed" },
  { kind: "ring", label: "Ring" },
  { kind: "parallelogram", label: "Skew" },
  { kind: "trapezoid", label: "Trapezoid" },
  { kind: "bubble", label: "Bubble" },
  { kind: "frame", label: "Frame" },
];

/* Small inline SVG previews for the shape gallery */
export const SHAPE_PREVIEWS: Record<ShapeKind, string> = {
  square: "M6 6 H26 V26 H6 Z",
  rect: "M4 9 H28 V23 H4 Z",
  rounded: "M9 6 H23 Q28 6 28 11 V21 Q28 26 23 26 H9 Q4 26 4 21 V11 Q4 6 9 6 Z",
  circle: "M16 4 A12 12 0 1 0 16 28 A12 12 0 1 0 16 4 Z",
  ellipse: "M16 8 A13 8 0 1 0 16 24 A13 8 0 1 0 16 8 Z",
  triangle: "M16 5 L28 27 H4 Z",
  "right-triangle": "M6 5 V27 H28 Z",
  diamond: "M16 4 L28 16 L16 28 L4 16 Z",
  pentagon: "M16 4 L27 12 L23 26 H9 L5 12 Z",
  hexagon: "M10 5 H22 L28 16 L22 27 H10 L4 16 Z",
  octagon: "M11 4 H21 L28 11 V21 L21 28 H11 L4 21 V11 Z",
  star: "M16 3 L19 12 L29 12 L21 18 L24 28 L16 22 L8 28 L11 18 L3 12 L13 12 Z",
  star4: "M16 3 L19 13 L29 16 L19 19 L16 29 L13 19 L3 16 L13 13 Z",
  heart:
    "M16 27 C8 20 3 15 3 10 C3 6 6 3 10 3 C12 3 15 5 16 8 C17 5 20 3 22 3 C26 3 29 6 29 10 C29 15 24 20 16 27 Z",
  arrow: "M4 13 H18 V7 L28 16 L18 25 V19 H4 Z",
  line: "M4 16 H28",
  "dashed-line": "M4 16 H9 M13 16 H18 M22 16 H28",
  ring: "M16 5 A11 11 0 1 0 16 27 A11 11 0 1 0 16 5 Z M16 11 A5 5 0 1 1 16 21 A5 5 0 1 1 16 11 Z",
  cross: "M12 4 H20 V12 H28 V20 H20 V28 H12 V20 H4 V12 H12 Z",
  parallelogram: "M10 8 H28 L22 24 H4 Z",
  trapezoid: "M10 8 H22 L28 24 H4 Z",
  bubble: "M8 5 H24 Q28 5 28 9 V17 Q28 21 24 21 H14 L8 27 L10 21 H8 Q4 21 4 17 V9 Q4 5 8 5 Z",
  frame: "M5 5 H27 V27 H5 Z M9 9 H23 V23 H9 Z",
};
