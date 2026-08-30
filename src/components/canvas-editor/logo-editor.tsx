"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  BringToFront,
  CaseUpper,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FlipHorizontal2,
  FlipVertical2,
  FolderOpen,
  Group as GroupIcon,
  Image as ImageIcon,
  Italic,
  Layers,
  Lock,
  LockOpen,
  Maximize2,
  Minus,
  MousePointer2,
  PaintBucket,
  Pencil,
  Plus,
  Redo2,
  Scissors,
  SendToBack,
  Shapes as ShapesIcon,
  Sparkles,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  Undo2,
  Ungroup,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { GeneratedLogo } from "@/types/logo";
import {
  BG_GRADIENTS,
  CANVAS_PRESETS,
  FONTS,
  SHAPE_LIBRARY,
  SHAPE_PREVIEWS,
  SWATCHES,
  ShapeKind,
  createShape,
  downloadDataUrl,
  downloadText,
  hexToRgba,
  makeLinearGradient,
} from "./editor-utils";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface LogoEditorProps {
  logo: GeneratedLogo | null;
  onClose?: () => void;
}

type Tool = "select" | "draw" | "shapes" | "text" | "images" | "canvas";
type BrushType = "pencil" | "spray" | "circle";

interface BgState {
  mode: "transparent" | "solid" | "gradient";
  color: string;
  gradientId: string;
}

interface ImageAdjust {
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
}

const DEFAULT_ADJUST: ImageAdjust = {
  grayscale: false,
  sepia: false,
  invert: false,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  blur: 0,
  hue: 0,
};

/* Custom props that must survive serialization (undo/redo, save/load) */
const EXTRA_PROPS = [
  "name",
  "locked",
  "adjustments",
  "selectable",
  "evented",
  "editable",
  "hasControls",
  "lockMovementX",
  "lockMovementY",
  "lockRotation",
  "lockScalingX",
  "lockScalingY",
];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------------ */
/* Tiny UI primitives                                                   */
/* ------------------------------------------------------------------ */

function TBtn({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded-lg border transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
        active
          ? "bg-white text-black border-white"
          : "bg-neutral-950 border-neutral-800 text-neutral-300 hover:bg-neutral-900 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-mono uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="text-[10px] font-mono text-neutral-300">
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 accent-white cursor-pointer"
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches?: boolean;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="text-[10px] font-mono text-neutral-400">{safe}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-9 rounded-md border border-neutral-800 bg-transparent cursor-pointer p-0.5"
        />
        {swatches && (
          <div className="flex flex-wrap gap-1">
            {SWATCHES.slice(0, 11).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                className="w-4 h-4 rounded-sm border border-neutral-700 cursor-pointer hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(v);
        }}
        className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-2 py-1 text-xs text-white focus:border-neutral-500 focus:outline-none"
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-xl bg-black border border-neutral-900 space-y-3">
      <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">{title}</h4>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Object metadata helpers                                              */
/* ------------------------------------------------------------------ */

function objectMeta(o: fabric.FabricObject): { label: string; Icon: React.ElementType } {
  const custom = (o as unknown as { name?: string }).name;
  if (o instanceof fabric.FabricImage) return { label: custom || "Image", Icon: ImageIcon };
  if (o instanceof fabric.Textbox) return { label: custom || "Text Box", Icon: Type };
  if (o instanceof fabric.IText) return { label: custom || "Text", Icon: Type };
  if (o instanceof fabric.ActiveSelection) return { label: "Selection", Icon: GroupIcon };
  if (o instanceof fabric.Group) return { label: custom || "Group", Icon: GroupIcon };
  if (o instanceof fabric.Path) return { label: custom || "Drawing", Icon: Pencil };
  if (o instanceof fabric.Polygon) return { label: custom || "Shape", Icon: ShapesIcon };
  if (o instanceof fabric.Polyline) return { label: custom || "Line", Icon: Minus };
  return { label: custom || "Shape", Icon: ShapesIcon };
}

/* ==================================================================== */
/* Main editor                                                          */
/* ==================================================================== */

export function LogoEditor({ logo, onClose }: LogoEditorProps) {
  /* ------------------------- refs & state -------------------------- */
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const disposeChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const clipboardRef = useRef<fabric.FabricObject | null>(null);
  const guideRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const historyRef = useRef<{
    stack: string[];
    index: number;
    restoring: boolean;
    timer: ReturnType<typeof setTimeout> | null;
  }>({ stack: [], index: -1, restoring: false, timer: null });

  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [ready, setReady] = useState(0);
  const [tool, setToolState] = useState<Tool>("select");
  const [activeObj, setActiveObj] = useState<fabric.FabricObject | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [lockAspect, setLockAspect] = useState(true);
  const [objects, setObjects] = useState<fabric.FabricObject[]>([]);
  const [histState, setHistState] = useState({ index: -1, length: 0 });

  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  const syncObjects = useCallback(() => {
    const c = fabricRef.current;
    setObjects(c ? [...c.getObjects()] : []);
  }, []);

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [design, setDesign] = useState({ w: 500, h: 500 });
  const designRef = useRef({ w: 500, h: 500 });
  const [customSize, setCustomSize] = useState({ w: 500, h: 500 });

  const [bg, setBg] = useState<BgState>({ mode: "transparent", color: "#0a0a0a", gradientId: "midnight" });
  const bgRef = useRef(bg);

  /* Draw tool options */
  const [brushType, setBrushType] = useState<BrushType>("pencil");
  const [brushColor, setBrushColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushSmoothing, setBrushSmoothing] = useState(2);
  const [brushShadow, setBrushShadow] = useState(false);

  /* Defaults for newly created shapes / text */
  const [shapeFill, setShapeFill] = useState("#ffffff");
  const [shapeStroke, setShapeStroke] = useState("#ffffff");
  const [shapeStrokeWidth, setShapeStrokeWidth] = useState(0);
  const [textDefaultColor, setTextDefaultColor] = useState("#ffffff");
  const [textDefaultFont, setTextDefaultFont] = useState(FONTS[0].value);

  /* --------------------------- history ------------------------------ */

  const pushHistoryNow = useCallback(() => {
    const c = fabricRef.current;
    const h = historyRef.current;
    if (!c || h.restoring) return;
    const snap = JSON.stringify(c.toObject(EXTRA_PROPS));
    if (h.stack[h.index] === snap) return;
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(snap);
    if (h.stack.length > 60) h.stack.shift();
    h.index = h.stack.length - 1;
    setHistState({ index: h.index, length: h.stack.length });
  }, []);

  const scheduleHistory = useCallback(() => {
    const h = historyRef.current;
    if (h.restoring) return;
    if (h.timer) clearTimeout(h.timer);
    h.timer = setTimeout(() => {
      h.timer = null;
      pushHistoryNow();
    }, 180);
  }, [pushHistoryNow]);

  const restoreFromHistory = useCallback(async (idx: number) => {
    const c = fabricRef.current;
    const h = historyRef.current;
    if (!c || idx < 0 || idx >= h.stack.length || h.restoring) return;
    h.restoring = true;
    h.index = idx;
    try {
      await c.loadFromJSON(JSON.parse(h.stack[idx]));
      /* the canvas may have been disposed while loadFromJSON enlivened objects */
      if (fabricRef.current !== c) return;
      c.discardActiveObject();
      c.requestRenderAll();
    } catch (err) {
      console.error("Failed to restore canvas history:", err);
      return;
    } finally {
      h.restoring = false;
    }
    /* sync background UI state from restored canvas */
    const bgVal = c.backgroundColor;
    setBg((prev) => {
      let next: BgState;
      if (!bgVal) next = { ...prev, mode: "transparent" };
      else if (typeof bgVal === "string") next = { ...prev, mode: "solid", color: bgVal };
      else next = { ...prev, mode: "gradient" };
      bgRef.current = next;
      return next;
    });
    setActiveObj(null);
    setHistState({ index: h.index, length: h.stack.length });
    syncObjects();
    forceRender();
  }, [syncObjects]);

  const undo = useCallback(
    () => restoreFromHistory(historyRef.current.index - 1),
    [restoreFromHistory]
  );
  const redo = useCallback(
    () => restoreFromHistory(historyRef.current.index + 1),
    [restoreFromHistory]
  );

  /* ----------------------- canvas lifecycle ------------------------- */

  useEffect(() => {
    let disposed = false;
    let canvas: fabric.Canvas | null = null;

    const init = async () => {
      /* fabric's dispose() is async: wait for any previous instance to
         fully tear down (StrictMode remounts immediately) before
         initializing the same <canvas> element again. */
      await disposeChainRef.current;
      const el = canvasElRef.current;
      if (disposed || !el) return;

      Object.assign(fabric.InteractiveFabricObject.ownDefaults, {
        cornerColor: "#ffffff",
        cornerStrokeColor: "#171717",
        cornerSize: 10,
        cornerStyle: "circle" as const,
        transparentCorners: false,
        borderColor: "#38bdf8",
        borderScaleFactor: 1.6,
      });

      const { w, h } = designRef.current;
      const z = zoomRef.current;
      canvas = new fabric.Canvas(el, {
        width: Math.round(w * z),
        height: Math.round(h * z),
        preserveObjectStacking: true,
        selection: true,
      });
      canvas.setZoom(z);
      fabricRef.current = canvas;
      historyRef.current = { stack: [], index: -1, restoring: false, timer: null };

      const c = canvas;
      const syncSelection = () => setActiveObj(c.getActiveObject() ?? null);
      c.on("selection:created", syncSelection);
      c.on("selection:updated", syncSelection);
      c.on("selection:cleared", () => setActiveObj(null));

      const onChange = () => {
        scheduleHistory();
        syncObjects();
        forceRender();
      };
      c.on("object:added", onChange);
      c.on("object:removed", onChange);
      c.on("object:modified", onChange);

      c.on("path:created", (e) => {
        const path = (e as { path?: fabric.FabricObject }).path;
        path?.set({ name: "Drawing" } as Partial<fabric.FabricObject>);
      });

      /* Canva-style snap-to-center while dragging, with magenta guides */
      c.on("object:moving", (e) => {
        const obj = e.target;
        if (!obj) return;
        const { w: dw, h: dh } = designRef.current;
        const threshold = 6 / c.getZoom();
        let gx: number | null = null;
        let gy: number | null = null;
        const center = obj.getCenterPoint();
        if (Math.abs(center.x - dw / 2) < threshold) {
          obj.setPositionByOrigin(new fabric.Point(dw / 2, center.y), "center", "center");
          gx = dw / 2;
        }
        const c2 = obj.getCenterPoint();
        if (Math.abs(c2.y - dh / 2) < threshold) {
          obj.setPositionByOrigin(new fabric.Point(c2.x, dh / 2), "center", "center");
          gy = dh / 2;
        }
        guideRef.current = { x: gx, y: gy };
      });
      c.on("mouse:up", () => {
        if (guideRef.current.x !== null || guideRef.current.y !== null) {
          guideRef.current = { x: null, y: null };
          c.requestRenderAll();
        }
      });
      c.on("after:render", (e) => {
        const g = guideRef.current;
        const ctx = (e as { ctx?: CanvasRenderingContext2D }).ctx;
        if (!ctx || (g.x === null && g.y === null)) return;
        const vpt = c.viewportTransform;
        const r = c.getRetinaScaling();
        const { w: dw, h: dh } = designRef.current;
        ctx.save();
        ctx.setTransform(r, 0, 0, r, 0, 0);
        ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        ctx.strokeStyle = "#ec4899";
        ctx.lineWidth = 1.2 / vpt[0];
        ctx.setLineDash([6 / vpt[0], 4 / vpt[0]]);
        ctx.beginPath();
        if (g.x !== null) {
          ctx.moveTo(g.x, 0);
          ctx.lineTo(g.x, dh);
        }
        if (g.y !== null) {
          ctx.moveTo(0, g.y);
          ctx.lineTo(dw, g.y);
        }
        ctx.stroke();
        ctx.restore();
      });

      /* Load the generated logo + brand name as a starting composition */
      if (logo?.imageUrl) {
        try {
          const img = await fabric.FabricImage.fromURL(logo.imageUrl, {
            crossOrigin: "anonymous",
          });
          if (disposed) return;
          img.scaleToWidth(Math.min(w * 0.56, 300));
          img.set({
            name: "Logo Icon",
            originX: "center",
            originY: "center",
            left: w / 2,
            top: h / 2 - h * 0.08,
          } as Partial<fabric.FabricObject>);
          c.add(img);

          const brandText = new fabric.IText((logo.brandName || "BRAND").toUpperCase(), {
            left: w / 2,
            top: h * 0.78,
            originX: "center",
            originY: "center",
            fontFamily: "Inter, sans-serif",
            fontSize: 30,
            fontWeight: "bold",
            fill: "#ffffff",
            charSpacing: 120,
          });
          brandText.set({ name: "Brand Name" } as Partial<fabric.FabricObject>);
          c.add(brandText);
          c.requestRenderAll();
        } catch (err) {
          console.error("Error loading logo onto canvas:", err);
        }
      }

      if (disposed) return;
      pushHistoryNow();
      syncObjects();
      setReady((r) => r + 1);
    };

    init();

    return () => {
      disposed = true;
      const c = canvas;
      disposeChainRef.current = disposeChainRef.current
        .then(() => c?.dispose())
        .catch(() => undefined);
      if (fabricRef.current === c) fabricRef.current = null;
      setActiveObj(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logo]);

  /* ------------------------- zoom & size ---------------------------- */

  useEffect(() => {
    zoomRef.current = zoom;
    designRef.current = design;
    const c = fabricRef.current;
    if (!c) return;
    c.setDimensions({ width: Math.round(design.w * zoom), height: Math.round(design.h * zoom) });
    c.setZoom(zoom);
    if (bgRef.current.mode === "gradient") {
      const grad = BG_GRADIENTS.find((g) => g.id === bgRef.current.gradientId) ?? BG_GRADIENTS[0];
      c.backgroundColor = makeLinearGradient(design.w, design.h, grad.stops);
    }
    c.requestRenderAll();
  }, [zoom, design, ready]);

  const zoomToFit = useCallback(() => {
    const el = viewportRef.current;
    const { w, h } = designRef.current;
    if (!el) return;
    const z = Math.min((el.clientWidth - 56) / w, (el.clientHeight - 56) / h);
    setZoom(clamp(Number(z.toFixed(3)), 0.05, 4));
  }, []);

  const applyCanvasSize = useCallback(
    (w: number, h: number) => {
      const cw = clamp(Math.round(w), 50, 4000);
      const ch = clamp(Math.round(h), 50, 4000);
      designRef.current = { w: cw, h: ch };
      setDesign({ w: cw, h: ch });
      setCustomSize({ w: cw, h: ch });
      requestAnimationFrame(zoomToFit);
    },
    [zoomToFit]
  );

  /* Ctrl + mouse wheel zoom on the viewport */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom((z) => clamp(Number((z * (e.deltaY > 0 ? 0.9 : 1.1)).toFixed(3)), 0.1, 4));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* --------------------------- brushes ------------------------------ */

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.isDrawingMode = tool === "draw";
    if (tool !== "draw") return;
    let brush: fabric.BaseBrush;
    if (brushType === "spray") brush = new fabric.SprayBrush(c);
    else if (brushType === "circle") brush = new fabric.CircleBrush(c);
    else {
      const pencil = new fabric.PencilBrush(c);
      pencil.decimate = brushSmoothing;
      brush = pencil;
    }
    brush.color = hexToRgba(brushColor, brushOpacity / 100);
    brush.width = brushSize;
    brush.shadow = brushShadow
      ? new fabric.Shadow({
          blur: 18,
          offsetX: 0,
          offsetY: 0,
          color: hexToRgba(brushColor, 0.55),
          affectStroke: true,
        })
      : null;
    c.freeDrawingBrush = brush;
  }, [tool, brushType, brushColor, brushSize, brushOpacity, brushSmoothing, brushShadow, ready]);

  const setTool = useCallback((t: Tool) => {
    setToolState(t);
    const c = fabricRef.current;
    if (c && t === "draw") {
      c.discardActiveObject();
      c.requestRenderAll();
    }
  }, []);

  /* ------------------------ object actions -------------------------- */

  const withCanvas = useCallback((fn: (c: fabric.Canvas) => void) => {
    const c = fabricRef.current;
    if (c) fn(c);
  }, []);

  const addToCanvas = useCallback(
    (obj: fabric.FabricObject, name: string) => {
      withCanvas((c) => {
        const { w, h } = designRef.current;
        obj.set({ name, left: w / 2, top: h / 2 } as Partial<fabric.FabricObject>);
        c.add(obj);
        c.setActiveObject(obj);
        c.requestRenderAll();
        setToolState("select");
      });
    },
    [withCanvas]
  );

  const addShape = useCallback(
    (kind: ShapeKind) => {
      const shape = createShape(kind, {
        fill: shapeFill,
        stroke: shapeStroke,
        strokeWidth: shapeStrokeWidth,
      });
      const label = SHAPE_LIBRARY.find((s) => s.kind === kind)?.label ?? "Shape";
      addToCanvas(shape, label);
    },
    [addToCanvas, shapeFill, shapeStroke, shapeStrokeWidth]
  );

  const addText = useCallback(
    (preset: "heading" | "subheading" | "body") => {
      const { w } = designRef.current;
      let obj: fabric.FabricObject;
      if (preset === "body") {
        obj = new fabric.Textbox("Add a block of body text. Double-click to edit.", {
          width: Math.min(300, w * 0.7),
          fontFamily: textDefaultFont,
          fontSize: 16,
          fill: textDefaultColor,
          originX: "center",
          originY: "center",
          textAlign: "center",
        });
      } else {
        obj = new fabric.IText(preset === "heading" ? "Heading Text" : "Subheading", {
          fontFamily: textDefaultFont,
          fontSize: preset === "heading" ? 44 : 26,
          fontWeight: preset === "heading" ? "bold" : "600",
          fill: textDefaultColor,
          originX: "center",
          originY: "center",
        });
      }
      addToCanvas(obj, preset === "heading" ? "Heading" : preset === "subheading" ? "Subheading" : "Text Box");
    },
    [addToCanvas, textDefaultColor, textDefaultFont]
  );

  const addLogoImage = useCallback(() => {
    if (!logo?.imageUrl) return;
    fabric.FabricImage.fromURL(logo.imageUrl, { crossOrigin: "anonymous" })
      .then((img) => {
        img.scaleToWidth(Math.min(designRef.current.w * 0.5, 280));
        img.set({ originX: "center", originY: "center" });
        addToCanvas(img, "Logo Icon");
      })
      .catch((err) => console.error("Failed to add logo image:", err));
  }, [logo, addToCanvas]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = String(reader.result);
        fabric.FabricImage.fromURL(url)
          .then((img) => {
            const { w, h } = designRef.current;
            const maxSide = Math.min(w, h) * 0.7;
            if (img.width > maxSide || img.height > maxSide) {
              img.scaleToWidth(maxSide);
            }
            img.set({ originX: "center", originY: "center" });
            addToCanvas(img, file.name.replace(/\.[^.]+$/, "") || "Image");
          })
          .catch((err) => console.error("Failed to load uploaded image:", err));
      };
      reader.readAsDataURL(file);
    },
    [addToCanvas]
  );

  const deleteSelection = useCallback(() => {
    withCanvas((c) => {
      const objs = c.getActiveObjects();
      if (!objs.length) return;
      objs.forEach((o) => c.remove(o));
      c.discardActiveObject();
      c.requestRenderAll();
    });
  }, [withCanvas]);

  const copySelection = useCallback(async () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject();
    if (!c || !a) return;
    clipboardRef.current = await a.clone(EXTRA_PROPS);
  }, []);

  const pasteClipboard = useCallback(async () => {
    const c = fabricRef.current;
    const src = clipboardRef.current;
    if (!c || !src) return;
    const cloned = await src.clone(EXTRA_PROPS);
    c.discardActiveObject();
    cloned.set({ left: (cloned.left ?? 0) + 18, top: (cloned.top ?? 0) + 18, evented: true });
    if (cloned instanceof fabric.ActiveSelection) {
      cloned.canvas = c;
      cloned.forEachObject((o) => c.add(o));
      cloned.setCoords();
    } else {
      c.add(cloned);
    }
    src.set({ left: (src.left ?? 0) + 18, top: (src.top ?? 0) + 18 });
    c.setActiveObject(cloned);
    c.requestRenderAll();
  }, []);

  const cutSelection = useCallback(async () => {
    await copySelection();
    deleteSelection();
  }, [copySelection, deleteSelection]);

  const duplicateSelection = useCallback(async () => {
    const c = fabricRef.current;
    const a = c?.getActiveObject();
    if (!c || !a) return;
    const cloned = await a.clone(EXTRA_PROPS);
    c.discardActiveObject();
    cloned.set({ left: (cloned.left ?? 0) + 18, top: (cloned.top ?? 0) + 18, evented: true });
    if (cloned instanceof fabric.ActiveSelection) {
      cloned.canvas = c;
      cloned.forEachObject((o) => c.add(o));
      cloned.setCoords();
    } else {
      c.add(cloned);
    }
    c.setActiveObject(cloned);
    c.requestRenderAll();
  }, []);

  const selectAll = useCallback(() => {
    withCanvas((c) => {
      const objs = c.getObjects().filter((o) => o.selectable !== false);
      if (!objs.length) return;
      c.discardActiveObject();
      const sel = new fabric.ActiveSelection(objs, { canvas: c });
      c.setActiveObject(sel);
      c.requestRenderAll();
      setActiveObj(sel);
    });
  }, [withCanvas]);

  const groupSelection = useCallback(() => {
    withCanvas((c) => {
      const a = c.getActiveObject();
      if (!(a instanceof fabric.ActiveSelection)) return;
      const objs = a.getObjects();
      c.discardActiveObject();
      objs.forEach((o) => c.remove(o));
      const group = new fabric.Group(objs);
      group.set({ name: "Group" } as Partial<fabric.FabricObject>);
      c.add(group);
      c.setActiveObject(group);
      c.requestRenderAll();
    });
  }, [withCanvas]);

  const ungroupSelection = useCallback(() => {
    withCanvas((c) => {
      const a = c.getActiveObject();
      if (!(a instanceof fabric.Group) || a instanceof fabric.ActiveSelection) return;
      const children = a.removeAll();
      c.remove(a);
      children.forEach((o) => c.add(o));
      const sel = new fabric.ActiveSelection(children, { canvas: c });
      c.setActiveObject(sel);
      c.requestRenderAll();
    });
  }, [withCanvas]);

  const nudgeSelection = useCallback(
    (dx: number, dy: number) => {
      withCanvas((c) => {
        const a = c.getActiveObject();
        if (!a) return;
        a.set({ left: (a.left ?? 0) + dx, top: (a.top ?? 0) + dy });
        a.setCoords();
        c.requestRenderAll();
        scheduleHistory();
      });
    },
    [withCanvas, scheduleHistory]
  );

  const alignSelection = useCallback(
    (mode: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => {
      withCanvas((c) => {
        const a = c.getActiveObject();
        if (!a) return;
        const { w, h } = designRef.current;
        const box = a.getBoundingRect();
        let dx = 0;
        let dy = 0;
        if (mode === "left") dx = -box.left;
        if (mode === "centerH") dx = w / 2 - (box.left + box.width / 2);
        if (mode === "right") dx = w - (box.left + box.width);
        if (mode === "top") dy = -box.top;
        if (mode === "centerV") dy = h / 2 - (box.top + box.height / 2);
        if (mode === "bottom") dy = h - (box.top + box.height);
        a.set({ left: (a.left ?? 0) + dx, top: (a.top ?? 0) + dy });
        a.setCoords();
        c.requestRenderAll();
        scheduleHistory();
        forceRender();
      });
    },
    [withCanvas, scheduleHistory]
  );

  const applyToSelection = useCallback(
    (props: Record<string, unknown>, textOnly = false) => {
      withCanvas((c) => {
        const objs = c.getActiveObjects();
        if (!objs.length) return;
        objs.forEach((o) => {
          if (textOnly && !(o instanceof fabric.IText)) return;
          o.set(props as Partial<fabric.FabricObject>);
          o.setCoords();
        });
        c.requestRenderAll();
        scheduleHistory();
        forceRender();
      });
    },
    [withCanvas, scheduleHistory]
  );

  const toggleLock = useCallback(() => {
    withCanvas((c) => {
      const a = c.getActiveObject();
      if (!a) return;
      const locked = !(a as unknown as { locked?: boolean }).locked;
      a.set({
        locked,
        lockMovementX: locked,
        lockMovementY: locked,
        lockRotation: locked,
        lockScalingX: locked,
        lockScalingY: locked,
        hasControls: !locked,
      } as Partial<fabric.FabricObject>);
      if (a instanceof fabric.IText) a.set({ editable: !locked });
      c.requestRenderAll();
      scheduleHistory();
      forceRender();
    });
  }, [withCanvas, scheduleHistory]);

  const reorder = useCallback(
    (action: "front" | "back" | "forward" | "backward", target?: fabric.FabricObject) => {
      withCanvas((c) => {
        const a = target ?? c.getActiveObject();
        if (!a) return;
        if (action === "front") c.bringObjectToFront(a);
        if (action === "back") c.sendObjectToBack(a);
        if (action === "forward") c.bringObjectForward(a);
        if (action === "backward") c.sendObjectBackwards(a);
        c.requestRenderAll();
        scheduleHistory();
        syncObjects();
        forceRender();
      });
    },
    [withCanvas, scheduleHistory, syncObjects]
  );

  /* -------------------------- background ---------------------------- */

  const applyBackground = useCallback(
    (next: BgState) => {
      bgRef.current = next;
      setBg(next);
      withCanvas((c) => {
        const { w, h } = designRef.current;
        if (next.mode === "transparent") {
          c.backgroundColor = "";
        } else if (next.mode === "solid") {
          c.backgroundColor = next.color;
        } else {
          const grad = BG_GRADIENTS.find((g) => g.id === next.gradientId) ?? BG_GRADIENTS[0];
          c.backgroundColor = makeLinearGradient(w, h, grad.stops);
        }
        c.requestRenderAll();
        scheduleHistory();
      });
    },
    [withCanvas, scheduleHistory]
  );

  const clearCanvas = useCallback(() => {
    if (!window.confirm("Clear the entire canvas? This removes every object.")) return;
    withCanvas((c) => {
      c.clear();
      setActiveObj(null);
      applyBackground(bgRef.current);
      pushHistoryNow();
      syncObjects();
    });
  }, [withCanvas, applyBackground, pushHistoryNow, syncObjects]);

  /* --------------------------- image filters ------------------------ */

  const getAdjust = (img: fabric.FabricObject): ImageAdjust => ({
    ...DEFAULT_ADJUST,
    ...((img as unknown as { adjustments?: Partial<ImageAdjust> }).adjustments ?? {}),
  });

  const setAdjust = useCallback(
    (patch: Partial<ImageAdjust>) => {
      withCanvas((c) => {
        const a = c.getActiveObject();
        if (!(a instanceof fabric.FabricImage)) return;
        const adj = { ...getAdjust(a), ...patch };
        (a as unknown as { adjustments: ImageAdjust }).adjustments = adj;
        const f: fabric.FabricImage["filters"] = [];
        if (adj.grayscale) f.push(new fabric.filters.Grayscale());
        if (adj.sepia) f.push(new fabric.filters.Sepia());
        if (adj.invert) f.push(new fabric.filters.Invert());
        if (adj.brightness) f.push(new fabric.filters.Brightness({ brightness: adj.brightness }));
        if (adj.contrast) f.push(new fabric.filters.Contrast({ contrast: adj.contrast }));
        if (adj.saturation) f.push(new fabric.filters.Saturation({ saturation: adj.saturation }));
        if (adj.hue) f.push(new fabric.filters.HueRotation({ rotation: adj.hue }));
        if (adj.blur) f.push(new fabric.filters.Blur({ blur: adj.blur }));
        a.filters = f;
        a.applyFilters();
        c.requestRenderAll();
        scheduleHistory();
        forceRender();
      });
    },
    [withCanvas, scheduleHistory]
  );

  /* ----------------------------- export ----------------------------- */

  const fileBase = useCallback(
    () => (logo?.brandName || "canvas-design").toLowerCase().replace(/\s+/g, "-"),
    [logo]
  );

  const runAtExportSize = useCallback(<T,>(fn: (c: fabric.Canvas) => T): T | undefined => {
    const c = fabricRef.current;
    if (!c) return undefined;
    const { w, h } = designRef.current;
    const z = zoomRef.current;
    c.discardActiveObject();
    c.setDimensions({ width: w, height: h });
    c.setZoom(1);
    c.renderAll();
    try {
      return fn(c);
    } finally {
      c.setDimensions({ width: Math.round(w * z), height: Math.round(h * z) });
      c.setZoom(z);
      c.requestRenderAll();
    }
  }, []);

  const exportPNG = useCallback(
    (multiplier: number, transparent: boolean) => {
      runAtExportSize((c) => {
        const orig = c.backgroundColor;
        if (transparent) c.backgroundColor = "";
        c.renderAll();
        const url = c.toDataURL({ format: "png", multiplier });
        c.backgroundColor = orig;
        downloadDataUrl(url, `${fileBase()}${transparent ? "-transparent" : ""}.png`);
      });
      setExportOpen(false);
    },
    [runAtExportSize, fileBase]
  );

  const exportJPG = useCallback(() => {
    runAtExportSize((c) => {
      const orig = c.backgroundColor;
      if (!orig) c.backgroundColor = "#ffffff";
      c.renderAll();
      const url = c.toDataURL({ format: "jpeg", quality: 0.92, multiplier: 2 });
      c.backgroundColor = orig;
      downloadDataUrl(url, `${fileBase()}.jpg`);
    });
    setExportOpen(false);
  }, [runAtExportSize, fileBase]);

  const exportSVG = useCallback(() => {
    const svg = runAtExportSize((c) => c.toSVG());
    if (svg) downloadText(svg, `${fileBase()}.svg`, "image/svg+xml");
    setExportOpen(false);
  }, [runAtExportSize, fileBase]);

  const copyPngToClipboard = useCallback(async () => {
    const url = runAtExportSize((c) => c.toDataURL({ format: "png", multiplier: 2 }));
    if (!url) return;
    try {
      const blob = await (await fetch(url)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
    setExportOpen(false);
  }, [runAtExportSize]);

  const exportJSON = useCallback(() => {
    const c = fabricRef.current;
    if (!c) return;
    downloadText(
      JSON.stringify({ design: designRef.current, canvas: c.toObject(EXTRA_PROPS) }, null, 2),
      `${fileBase()}.json`,
      "application/json"
    );
    setExportOpen(false);
  }, [fileBase]);

  const importJSON = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      const c = fabricRef.current;
      if (!file || !c) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const data = parsed.canvas ?? parsed;
          if (parsed.design?.w && parsed.design?.h) {
            applyCanvasSize(parsed.design.w, parsed.design.h);
          }
          historyRef.current.restoring = true;
          await c.loadFromJSON(data);
          historyRef.current.restoring = false;
          c.discardActiveObject();
          c.requestRenderAll();
          setActiveObj(null);
          pushHistoryNow();
          syncObjects();
        } catch (err) {
          historyRef.current.restoring = false;
          console.error("Failed to import design JSON:", err);
        }
      };
      reader.readAsText(file);
      setExportOpen(false);
    },
    [applyCanvasSize, pushHistoryNow, syncObjects]
  );

  /* ------------------------ keyboard shortcuts ---------------------- */

  const actionsRef = useRef<Record<string, (...args: never[]) => void>>({});
  const nudgeRef = useRef(nudgeSelection);
  useEffect(() => {
    actionsRef.current = {
      undo,
      redo,
      copySelection,
      pasteClipboard,
      cutSelection,
      duplicateSelection,
      deleteSelection,
      selectAll,
      groupSelection,
      ungroupSelection,
    } as Record<string, (...args: never[]) => void>;
    nudgeRef.current = nudgeSelection;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      )
        return;
      const c = fabricRef.current;
      if (!c) return;
      const active = c.getActiveObject();
      if (active instanceof fabric.IText && active.isEditing) return;

      const acts = actionsRef.current;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        acts.undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        acts.redo();
      } else if (mod && e.key.toLowerCase() === "c") {
        acts.copySelection();
      } else if (mod && e.key.toLowerCase() === "v") {
        acts.pasteClipboard();
      } else if (mod && e.key.toLowerCase() === "x") {
        acts.cutSelection();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        acts.duplicateSelection();
      } else if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        acts.selectAll();
      } else if (mod && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        acts.groupSelection();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        acts.ungroupSelection();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        acts.deleteSelection();
      } else if (e.key === "Escape") {
        c.discardActiveObject();
        c.requestRenderAll();
      } else if (e.key.startsWith("Arrow")) {
        const step = e.shiftKey ? 10 : 1;
        const map: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const d = map[e.key];
        if (d && c.getActiveObject()) {
          e.preventDefault();
          nudgeRef.current(d[0], d[1]);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ----------------------- derived selection ------------------------ */

  const active = activeObj;
  const isText = active instanceof fabric.IText;
  const isImage = active instanceof fabric.FabricImage;
  const isMulti = active instanceof fabric.ActiveSelection;
  const isGroup = active instanceof fabric.Group && !isMulti;
  const isRect = active instanceof fabric.Rect;
  const isLocked = !!(active as unknown as { locked?: boolean })?.locked;
  const activeShadow = (active?.shadow ?? null) as fabric.Shadow | null;
  const activeCenter = active?.getCenterPoint();
  const fillValue = typeof active?.fill === "string" ? active.fill : "#ffffff";
  const strokeValue = typeof active?.stroke === "string" ? active.stroke : "#ffffff";
  const textObj = isText ? (active as fabric.IText) : null;
  const adjust = isImage && active ? getAdjust(active) : DEFAULT_ADJUST;

  /* ================================ UI =============================== */

  return (
    <div className="w-full rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden">
      {/* ------------------------- Top toolbar ------------------------- */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-b border-neutral-900 bg-black">
        {onClose && (
          <TBtn title="Back to Studio" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </TBtn>
        )}

        <div className="flex items-center gap-1 pr-2 border-r border-neutral-900">
          <TBtn title="Undo (Ctrl+Z)" onClick={undo} disabled={histState.index <= 0}>
            <Undo2 className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn
            title="Redo (Ctrl+Y)"
            onClick={redo}
            disabled={histState.index >= histState.length - 1}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </TBtn>
        </div>

        <div className="flex items-center gap-1 pr-2 border-r border-neutral-900">
          <TBtn title="Copy (Ctrl+C)" onClick={copySelection} disabled={!active}>
            <Copy className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Paste (Ctrl+V)" onClick={pasteClipboard}>
            <ClipboardPaste className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Cut (Ctrl+X)" onClick={cutSelection} disabled={!active}>
            <Scissors className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Duplicate (Ctrl+D)" onClick={duplicateSelection} disabled={!active}>
            <Plus className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Delete (Del)" onClick={deleteSelection} disabled={!active}>
            <Trash2 className="w-3.5 h-3.5" />
          </TBtn>
        </div>

        <div className="flex items-center gap-1 pr-2 border-r border-neutral-900">
          <TBtn title="Group (Ctrl+G)" onClick={groupSelection} disabled={!isMulti}>
            <GroupIcon className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Ungroup (Ctrl+Shift+G)" onClick={ungroupSelection} disabled={!isGroup}>
            <Ungroup className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Bring to Front" onClick={() => reorder("front")} disabled={!active}>
            <BringToFront className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Send to Back" onClick={() => reorder("back")} disabled={!active}>
            <SendToBack className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn
            title="Flip Horizontal"
            onClick={() => applyToSelection({ flipX: !active?.flipX })}
            disabled={!active}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn
            title="Flip Vertical"
            onClick={() => applyToSelection({ flipY: !active?.flipY })}
            disabled={!active}
          >
            <FlipVertical2 className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn
            title={isLocked ? "Unlock" : "Lock"}
            onClick={toggleLock}
            disabled={!active}
            active={isLocked}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
          </TBtn>
        </div>

        {/* Align to canvas */}
        <div className="flex items-center gap-1 pr-2 border-r border-neutral-900">
          <TBtn title="Align Left" onClick={() => alignSelection("left")} disabled={!active}>
            <AlignLeft className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Center Horizontally" onClick={() => alignSelection("centerH")} disabled={!active}>
            <AlignCenter className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Align Right" onClick={() => alignSelection("right")} disabled={!active}>
            <AlignRight className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Align Top" onClick={() => alignSelection("top")} disabled={!active}>
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Center Vertically" onClick={() => alignSelection("centerV")} disabled={!active}>
            <Minus className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Align Bottom" onClick={() => alignSelection("bottom")} disabled={!active}>
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </TBtn>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <TBtn title="Zoom Out" onClick={() => setZoom((z) => clamp(z - 0.1, 0.1, 4))}>
            <ZoomOut className="w-3.5 h-3.5" />
          </TBtn>
          <span className="text-[11px] font-mono text-neutral-300 w-11 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <TBtn title="Zoom In" onClick={() => setZoom((z) => clamp(z + 0.1, 0.1, 4))}>
            <ZoomIn className="w-3.5 h-3.5" />
          </TBtn>
          <TBtn title="Fit to Screen" onClick={zoomToFit}>
            <Maximize2 className="w-3.5 h-3.5" />
          </TBtn>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="text-[10px] font-mono px-1.5 py-1 rounded-md border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white cursor-pointer"
          >
            100%
          </button>
        </div>

        {/* Export */}
        <div ref={exportRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setExportOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export
            <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
          </button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
              <button type="button" onClick={() => exportPNG(1, false)} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors">
                PNG — 1× standard
              </button>
              <button type="button" onClick={() => exportPNG(2, false)} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors">
                PNG — 2× high-res (2000px)
              </button>
              <button type="button" onClick={() => exportPNG(4, false)} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors">
                PNG — 4× ultra (4000px)
              </button>
              <button type="button" onClick={() => exportPNG(2, true)} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:bg-neutral-800 hover:text-amber-200 cursor-pointer transition-colors">
                PNG — transparent (2×)
              </button>
              <button type="button" onClick={exportJPG} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-200 hover:bg-neutral-800 hover:text-white cursor-pointer transition-colors">
                JPG — 2× high-res
              </button>
              <button type="button" onClick={exportSVG} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-emerald-300 hover:bg-neutral-800 hover:text-emerald-200 cursor-pointer transition-colors">
                SVG — scalable vector
              </button>
              <button type="button" onClick={copyPngToClipboard} className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-cyan-300 hover:bg-neutral-800 hover:text-cyan-200 cursor-pointer transition-colors">
                Copy PNG to clipboard
              </button>
              <div className="border-t border-neutral-800 my-1" />
              <button
                type="button"
                onClick={exportJSON}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <FileJson className="w-3.5 h-3.5 text-neutral-400" /> Save design (.json)
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5 text-neutral-400" /> Load design (.json)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --------------------------- Workspace ------------------------- */}
      <div className="flex items-stretch" style={{ minHeight: "68vh" }}>
        {/* Left tool rail */}
        <div className="flex flex-col items-center gap-1 p-1.5 border-r border-neutral-900 bg-black">
          {(
            [
              { t: "select", Icon: MousePointer2, label: "Select & move (V)" },
              { t: "draw", Icon: Pencil, label: "Draw — pencil, spray, dots" },
              { t: "shapes", Icon: ShapesIcon, label: "Shapes library" },
              { t: "text", Icon: Type, label: "Text" },
              { t: "images", Icon: ImageIcon, label: "Images & uploads" },
              { t: "canvas", Icon: PaintBucket, label: "Canvas background & size" },
            ] as { t: Tool; Icon: React.ElementType; label: string }[]
          ).map(({ t, Icon, label }) => (
            <button
              key={t}
              type="button"
              title={label}
              onClick={() => setTool(t)}
              className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                tool === t
                  ? "bg-white text-black"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900"
              }`}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Tool drawer */}
        {tool !== "select" && (
          <div className="w-60 shrink-0 border-r border-neutral-900 bg-neutral-950 p-3 space-y-3 overflow-y-auto max-h-[75vh]">
            {tool === "draw" && (
              <>
                <Section title="Brush Type">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { v: "pencil", label: "Pencil" },
                        { v: "spray", label: "Spray" },
                        { v: "circle", label: "Dots" },
                      ] as { v: BrushType; label: string }[]
                    ).map(({ v, label }) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setBrushType(v)}
                        className={`py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors ${
                          brushType === v
                            ? "bg-white text-black border-white"
                            : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="Brush Options">
                  <ColorField label="Color" value={brushColor} onChange={setBrushColor} swatches />
                  <SliderRow label="Size" value={brushSize} min={1} max={60} suffix="px" onChange={setBrushSize} />
                  <SliderRow
                    label="Opacity"
                    value={brushOpacity}
                    min={5}
                    max={100}
                    suffix="%"
                    onChange={setBrushOpacity}
                  />
                  {brushType === "pencil" && (
                    <SliderRow
                      label="Smoothing"
                      value={brushSmoothing}
                      min={0}
                      max={10}
                      step={0.5}
                      onChange={setBrushSmoothing}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setBrushShadow((s) => !s)}
                    className={`w-full py-1.5 rounded-lg text-[11px] font-medium border cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
                      brushShadow
                        ? "bg-white text-black border-white"
                        : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> Glow {brushShadow ? "On" : "Off"}
                  </button>
                </Section>
                <p className="text-[10px] text-neutral-500 leading-relaxed px-1">
                  Draw directly on the canvas. Strokes become objects you can select, move, and style
                  afterwards with the Select tool.
                </p>
              </>
            )}

            {tool === "shapes" && (
              <>
                <Section title="Shape Library">
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPE_LIBRARY.map(({ kind, label }) => (
                      <button
                        key={kind}
                        type="button"
                        title={label}
                        onClick={() => addShape(kind)}
                        className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border border-neutral-800 bg-black text-neutral-300 hover:bg-neutral-900 hover:text-white hover:border-neutral-600 cursor-pointer transition-colors"
                      >
                        <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                          <path
                            d={SHAPE_PREVIEWS[kind]}
                            fill={
                              kind === "line" || kind === "dashed-line" || kind === "frame" || kind === "ring"
                                ? "none"
                                : "currentColor"
                            }
                            stroke="currentColor"
                            strokeWidth={
                              kind === "line" || kind === "dashed-line" ? 2.5 : kind === "frame" || kind === "ring" ? 1.5 : 0
                            }
                            fillRule="evenodd"
                          />
                        </svg>
                        <span className="text-[9px] leading-none">{label}</span>
                      </button>
                    ))}
                  </div>
                </Section>
                <Section title="New Shape Style">
                  <ColorField label="Fill" value={shapeFill} onChange={setShapeFill} swatches />
                  <ColorField label="Stroke" value={shapeStroke} onChange={setShapeStroke} />
                  <SliderRow
                    label="Stroke Width"
                    value={shapeStrokeWidth}
                    min={0}
                    max={20}
                    suffix="px"
                    onChange={setShapeStrokeWidth}
                  />
                </Section>
              </>
            )}

            {tool === "text" && (
              <>
                <Section title="Add Text">
                  <button
                    type="button"
                    onClick={() => addText("heading")}
                    className="w-full py-2 rounded-lg border border-neutral-800 bg-black text-white text-lg font-bold hover:bg-neutral-900 cursor-pointer"
                  >
                    Add Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => addText("subheading")}
                    className="w-full py-2 rounded-lg border border-neutral-800 bg-black text-white text-sm font-semibold hover:bg-neutral-900 cursor-pointer"
                  >
                    Add Subheading
                  </button>
                  <button
                    type="button"
                    onClick={() => addText("body")}
                    className="w-full py-2 rounded-lg border border-neutral-800 bg-black text-neutral-300 text-xs hover:bg-neutral-900 cursor-pointer"
                  >
                    Add body text box
                  </button>
                  {logo && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = new fabric.IText((logo.brandName || "BRAND").toUpperCase(), {
                          fontFamily: textDefaultFont,
                          fontSize: 32,
                          fontWeight: "bold",
                          fill: textDefaultColor,
                          charSpacing: 120,
                          originX: "center",
                          originY: "center",
                        });
                        addToCanvas(t, "Brand Name");
                      }}
                      className="w-full py-2 rounded-lg border border-neutral-800 bg-black text-neutral-300 text-xs font-mono uppercase tracking-widest hover:bg-neutral-900 cursor-pointer"
                    >
                      {logo.brandName}
                    </button>
                  )}
                </Section>
                <Section title="New Text Defaults">
                  <Field label="Font Family">
                    <select
                      value={textDefaultFont}
                      onChange={(e) => setTextDefaultFont(e.target.value)}
                      className="w-full rounded-lg bg-black border border-neutral-800 px-2 py-1.5 text-xs text-white focus:border-neutral-500 focus:outline-none"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value} className="bg-black">
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <ColorField label="Color" value={textDefaultColor} onChange={setTextDefaultColor} swatches />
                </Section>
                <p className="text-[10px] text-neutral-500 leading-relaxed px-1">
                  Double-click any text on the canvas to edit it. Select it to unlock full typography
                  controls in the right panel.
                </p>
              </>
            )}

            {tool === "images" && (
              <>
                <Section title="Images">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full py-2.5 rounded-lg border border-dashed border-neutral-700 bg-black text-neutral-300 text-xs hover:bg-neutral-900 hover:text-white cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Upload image
                  </button>
                  {logo?.imageUrl && (
                    <button
                      type="button"
                      onClick={addLogoImage}
                      className="w-full py-2 rounded-lg border border-neutral-800 bg-black text-neutral-300 text-xs hover:bg-neutral-900 hover:text-white cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Re-add generated logo
                    </button>
                  )}
                </Section>
                <p className="text-[10px] text-neutral-500 leading-relaxed px-1">
                  Select an image on the canvas to apply filters — grayscale, sepia, brightness,
                  contrast, saturation, hue and blur — from the right panel.
                </p>
              </>
            )}

            {tool === "canvas" && (
              <>
                <Section title="Background">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyBackground({ ...bg, mode: "transparent" })}
                      className={`py-1.5 rounded-lg text-[11px] border cursor-pointer ${
                        bg.mode === "transparent"
                          ? "bg-white text-black border-white font-semibold"
                          : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Transparent
                    </button>
                    <button
                      type="button"
                      onClick={() => applyBackground({ ...bg, mode: "solid" })}
                      className={`py-1.5 rounded-lg text-[11px] border cursor-pointer ${
                        bg.mode === "solid"
                          ? "bg-white text-black border-white font-semibold"
                          : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      Solid Color
                    </button>
                  </div>
                  {bg.mode === "solid" && (
                    <ColorField
                      label="Background Color"
                      value={bg.color}
                      onChange={(v) => applyBackground({ ...bg, mode: "solid", color: v })}
                      swatches
                    />
                  )}
                  <Field label="Gradients">
                    <div className="grid grid-cols-4 gap-1.5">
                      {BG_GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          title={g.id}
                          onClick={() => applyBackground({ ...bg, mode: "gradient", gradientId: g.id })}
                          className={`h-9 rounded-lg border cursor-pointer transition-transform hover:scale-105 ${
                            bg.mode === "gradient" && bg.gradientId === g.id
                              ? "border-white ring-1 ring-white"
                              : "border-neutral-800"
                          }`}
                          style={{
                            background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]})`,
                          }}
                        />
                      ))}
                    </div>
                  </Field>
                </Section>
                <Section title="Canvas Size">
                  <select
                    value=""
                    onChange={(e) => {
                      const p = CANVAS_PRESETS.find((x) => x.label === e.target.value);
                      if (p) applyCanvasSize(p.w, p.h);
                    }}
                    className="w-full rounded-lg bg-black border border-neutral-800 px-2 py-1.5 text-xs text-white focus:border-neutral-500 focus:outline-none"
                  >
                    <option value="" disabled className="bg-black">
                      Preset sizes…
                    </option>
                    {CANVAS_PRESETS.map((p) => (
                      <option key={p.label} value={p.label} className="bg-black">
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <NumField
                      label="Width"
                      value={customSize.w}
                      min={50}
                      max={4000}
                      onChange={(v) => setCustomSize((s) => ({ ...s, w: v }))}
                    />
                    <NumField
                      label="Height"
                      value={customSize.h}
                      min={50}
                      max={4000}
                      onChange={(v) => setCustomSize((s) => ({ ...s, h: v }))}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => applyCanvasSize(customSize.w, customSize.h)}
                    className="w-full py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 cursor-pointer"
                  >
                    Apply Size
                  </button>
                </Section>
                <Section title="Danger Zone">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="w-full py-1.5 rounded-lg border border-rose-950 bg-black text-rose-400 text-[11px] hover:bg-rose-950/40 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" /> Clear canvas
                  </button>
                </Section>
              </>
            )}
          </div>
        )}

        {/* Canvas viewport */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-auto bg-[#0d0d0d] relative"
          style={{ maxHeight: "75vh" }}
        >
          <div className="min-w-full min-h-full flex items-center justify-center p-7" style={{ width: "max-content", minWidth: "100%" }}>
            <div
              className={`shadow-2xl ring-1 ring-neutral-800 ${
                bg.mode === "transparent"
                  ? "bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] bg-[size:14px_14px] bg-neutral-950"
                  : ""
              }`}
            >
              <canvas ref={canvasElRef} />
            </div>
          </div>
        </div>

        {/* Right panel: properties + layers */}
        <div className="w-64 shrink-0 border-l border-neutral-900 bg-neutral-950 p-3 space-y-3 overflow-y-auto" style={{ maxHeight: "75vh" }}>
          {!active && (
            <Section title="Properties">
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Select an object on the canvas to edit its properties — or pick a tool on the left to
                add shapes, text, drawings and images.
              </p>
              <div className="text-[10px] text-neutral-600 font-mono space-y-0.5 pt-1 border-t border-neutral-900">
                <p>Ctrl+Z / Y — undo / redo</p>
                <p>Ctrl+C / V / D — copy / paste / duplicate</p>
                <p>Ctrl+G — group · Del — delete</p>
                <p>Arrows — nudge · Ctrl+wheel — zoom</p>
              </div>
            </Section>
          )}

          {active && (
            <>
              {/* Typography */}
              {isText && textObj && (
                <Section title="Typography">
                  <Field label="Font Family">
                    <select
                      value={String(textObj.fontFamily ?? FONTS[0].value)}
                      onChange={(e) => applyToSelection({ fontFamily: e.target.value }, true)}
                      className="w-full rounded-lg bg-black border border-neutral-800 px-2 py-1.5 text-xs text-white focus:border-neutral-500 focus:outline-none"
                    >
                      {FONTS.map((f) => (
                        <option key={f.value} value={f.value} className="bg-black">
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-2">
                    <NumField
                      label="Size"
                      value={Math.round(Number(textObj.fontSize ?? 24))}
                      min={6}
                      max={400}
                      onChange={(v) => applyToSelection({ fontSize: clamp(v, 6, 400) }, true)}
                    />
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-neutral-500 mb-0.5">
                        Style
                      </label>
                      <div className="flex gap-1">
                        <TBtn
                          title="Bold"
                          active={textObj.fontWeight === "bold"}
                          onClick={() =>
                            applyToSelection(
                              { fontWeight: textObj.fontWeight === "bold" ? "normal" : "bold" },
                              true
                            )
                          }
                        >
                          <Bold className="w-3 h-3" />
                        </TBtn>
                        <TBtn
                          title="Italic"
                          active={textObj.fontStyle === "italic"}
                          onClick={() =>
                            applyToSelection(
                              { fontStyle: textObj.fontStyle === "italic" ? "normal" : "italic" },
                              true
                            )
                          }
                        >
                          <Italic className="w-3 h-3" />
                        </TBtn>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <TBtn
                      title="Underline"
                      active={!!textObj.underline}
                      onClick={() => applyToSelection({ underline: !textObj.underline }, true)}
                    >
                      <Underline className="w-3 h-3" />
                    </TBtn>
                    <TBtn
                      title="Strikethrough"
                      active={!!textObj.linethrough}
                      onClick={() => applyToSelection({ linethrough: !textObj.linethrough }, true)}
                    >
                      <Strikethrough className="w-3 h-3" />
                    </TBtn>
                    <TBtn
                      title="UPPERCASE"
                      onClick={() => applyToSelection({ text: textObj.text?.toUpperCase() }, true)}
                    >
                      <CaseUpper className="w-3 h-3" />
                    </TBtn>
                    <span className="w-px bg-neutral-900 mx-0.5" />
                    {(
                      [
                        ["left", AlignLeft],
                        ["center", AlignCenter],
                        ["right", AlignRight],
                        ["justify", AlignJustify],
                      ] as [string, React.ElementType][]
                    ).map(([align, Icon]) => (
                      <TBtn
                        key={align}
                        title={`Align ${align}`}
                        active={textObj.textAlign === align}
                        onClick={() => applyToSelection({ textAlign: align }, true)}
                      >
                        <Icon className="w-3 h-3" />
                      </TBtn>
                    ))}
                  </div>
                  <SliderRow
                    label="Letter Spacing"
                    value={Number(textObj.charSpacing ?? 0)}
                    min={-100}
                    max={800}
                    step={10}
                    onChange={(v) => applyToSelection({ charSpacing: v }, true)}
                  />
                  <SliderRow
                    label="Line Height"
                    value={Number(textObj.lineHeight ?? 1.16)}
                    min={0.5}
                    max={2.5}
                    step={0.05}
                    onChange={(v) => applyToSelection({ lineHeight: v }, true)}
                  />
                </Section>
              )}

              {/* Image filters */}
              {isImage && (
                <Section title="Image Filters">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["grayscale", "B&W"],
                        ["sepia", "Sepia"],
                        ["invert", "Invert"],
                      ] as [keyof ImageAdjust, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAdjust({ [key]: !adjust[key] })}
                        className={`py-1.5 rounded-lg text-[11px] border cursor-pointer ${
                          adjust[key]
                            ? "bg-white text-black border-white font-semibold"
                            : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <SliderRow
                    label="Brightness"
                    value={adjust.brightness}
                    min={-0.6}
                    max={0.6}
                    step={0.02}
                    onChange={(v) => setAdjust({ brightness: v })}
                  />
                  <SliderRow
                    label="Contrast"
                    value={adjust.contrast}
                    min={-0.6}
                    max={0.6}
                    step={0.02}
                    onChange={(v) => setAdjust({ contrast: v })}
                  />
                  <SliderRow
                    label="Saturation"
                    value={adjust.saturation}
                    min={-1}
                    max={1}
                    step={0.05}
                    onChange={(v) => setAdjust({ saturation: v })}
                  />
                  <SliderRow
                    label="Hue"
                    value={adjust.hue}
                    min={-2}
                    max={2}
                    step={0.05}
                    onChange={(v) => setAdjust({ hue: v })}
                  />
                  <SliderRow
                    label="Blur"
                    value={adjust.blur}
                    min={0}
                    max={0.6}
                    step={0.02}
                    onChange={(v) => setAdjust({ blur: v })}
                  />
                </Section>
              )}

              {/* Fill & stroke for shapes/text/drawings */}
              {!isImage && !isMulti && !isGroup && (
                <Section title="Fill & Stroke">
                  <ColorField
                    label={isText ? "Text Color" : "Fill"}
                    value={fillValue}
                    onChange={(v) => applyToSelection({ fill: v })}
                    swatches
                  />
                  <ColorField
                    label="Stroke"
                    value={strokeValue}
                    onChange={(v) =>
                      applyToSelection({
                        stroke: v,
                        strokeWidth: Math.max(1, Number(active.strokeWidth ?? 0)),
                      })
                    }
                  />
                  <SliderRow
                    label="Stroke Width"
                    value={Number(active.strokeWidth ?? 0)}
                    min={0}
                    max={40}
                    suffix="px"
                    onChange={(v) => applyToSelection({ strokeWidth: v })}
                  />
                  <Field label="Stroke Style">
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          ["Solid", null],
                          ["Dashed", [12, 8]],
                          ["Dotted", [2, 6]],
                        ] as [string, number[] | null][]
                      ).map(([label, dash]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => applyToSelection({ strokeDashArray: dash })}
                          className="py-1 rounded-lg text-[10px] border border-neutral-800 bg-black text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </Field>
                  {isRect && (
                    <SliderRow
                      label="Corner Radius"
                      value={Number((active as fabric.Rect).rx ?? 0)}
                      min={0}
                      max={150}
                      onChange={(v) => applyToSelection({ rx: v, ry: v })}
                    />
                  )}
                </Section>
              )}

              {/* Transform & Scale */}
              <Section title="Transform & Scale">
                <div className="grid grid-cols-2 gap-2">
                  <NumField
                    label="X (center)"
                    value={Math.round(activeCenter?.x ?? 0)}
                    onChange={(v) => {
                      active.setPositionByOrigin(
                        new fabric.Point(v, activeCenter?.y ?? 0),
                        "center",
                        "center"
                      );
                      active.setCoords();
                      fabricRef.current?.requestRenderAll();
                      scheduleHistory();
                      forceRender();
                    }}
                  />
                  <NumField
                    label="Y (center)"
                    value={Math.round(activeCenter?.y ?? 0)}
                    onChange={(v) => {
                      active.setPositionByOrigin(
                        new fabric.Point(activeCenter?.x ?? 0, v),
                        "center",
                        "center"
                      );
                      active.setCoords();
                      fabricRef.current?.requestRenderAll();
                      scheduleHistory();
                      forceRender();
                    }}
                  />
                  <NumField
                    label="Width"
                    value={Math.round(active.getScaledWidth())}
                    min={1}
                    onChange={(v) => {
                      if (v > 0) {
                        const curW = active.getScaledWidth();
                        if (lockAspect && curW > 0) {
                          const ratio = v / curW;
                          active.scale((active.scaleX ?? 1) * ratio);
                        } else {
                          active.scaleToWidth(v);
                        }
                        active.setCoords();
                        fabricRef.current?.requestRenderAll();
                        scheduleHistory();
                        forceRender();
                      }
                    }}
                  />
                  <NumField
                    label="Height"
                    value={Math.round(active.getScaledHeight())}
                    min={1}
                    onChange={(v) => {
                      if (v > 0) {
                        const curH = active.getScaledHeight();
                        if (lockAspect && curH > 0) {
                          const ratio = v / curH;
                          active.scale((active.scaleY ?? 1) * ratio);
                        } else {
                          active.scaleToHeight(v);
                        }
                        active.setCoords();
                        fabricRef.current?.requestRenderAll();
                        scheduleHistory();
                        forceRender();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] font-mono uppercase text-neutral-500">Uniform Scale</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        active.scale((active.scaleX ?? 1) * 0.9);
                        active.setCoords();
                        fabricRef.current?.requestRenderAll();
                        scheduleHistory();
                        forceRender();
                      }}
                      className="px-1.5 py-0.5 rounded bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      title="Scale down 10%"
                    >
                      -10%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        active.scale((active.scaleX ?? 1) * 1.1);
                        active.setCoords();
                        fabricRef.current?.requestRenderAll();
                        scheduleHistory();
                        forceRender();
                      }}
                      className="px-1.5 py-0.5 rounded bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      title="Scale up 10%"
                    >
                      +10%
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        active.scale((active.scaleX ?? 1) * 1.25);
                        active.setCoords();
                        fabricRef.current?.requestRenderAll();
                        scheduleHistory();
                        forceRender();
                      }}
                      className="px-1.5 py-0.5 rounded bg-black border border-neutral-800 hover:border-neutral-700 text-[10px] font-mono text-neutral-400 hover:text-white cursor-pointer transition-colors"
                      title="Scale up 25%"
                    >
                      +25%
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLockAspect((l) => !l)}
                  className={`w-full py-1 rounded-lg text-[10px] font-mono border cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                    lockAspect
                      ? "bg-neutral-900 border-neutral-700 text-blue-400"
                      : "bg-black border-neutral-800 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  {lockAspect ? "Aspect Ratio: Locked" : "Aspect Ratio: Freeform"}
                </button>
                <SliderRow
                  label="Rotation"
                  value={Math.round(active.angle ?? 0)}
                  min={-180}
                  max={180}
                  suffix="°"
                  onChange={(v) => {
                    active.rotate(v);
                    active.setCoords();
                    fabricRef.current?.requestRenderAll();
                    scheduleHistory();
                    forceRender();
                  }}
                />
                <SliderRow
                  label="Opacity"
                  value={Math.round(Number(active.opacity ?? 1) * 100)}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(v) => applyToSelection({ opacity: v / 100 })}
                />
              </Section>

              {/* Shadow */}
              <Section title="Shadow">
                <button
                  type="button"
                  onClick={() =>
                    applyToSelection({
                      shadow: activeShadow
                        ? null
                        : new fabric.Shadow({
                            color: "rgba(0,0,0,0.45)",
                            blur: 14,
                            offsetX: 6,
                            offsetY: 6,
                          }),
                    })
                  }
                  className={`w-full py-1.5 rounded-lg text-[11px] border cursor-pointer ${
                    activeShadow
                      ? "bg-white text-black border-white font-semibold"
                      : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {activeShadow ? "Shadow On" : "Add Shadow"}
                </button>
                {activeShadow && (
                  <>
                    <SliderRow
                      label="Blur"
                      value={Number(activeShadow.blur ?? 0)}
                      min={0}
                      max={60}
                      onChange={(v) =>
                        applyToSelection({
                          shadow: new fabric.Shadow({ ...activeShadow.toObject(), blur: v }),
                        })
                      }
                    />
                    <SliderRow
                      label="Offset X"
                      value={Number(activeShadow.offsetX ?? 0)}
                      min={-50}
                      max={50}
                      onChange={(v) =>
                        applyToSelection({
                          shadow: new fabric.Shadow({ ...activeShadow.toObject(), offsetX: v }),
                        })
                      }
                    />
                    <SliderRow
                      label="Offset Y"
                      value={Number(activeShadow.offsetY ?? 0)}
                      min={-50}
                      max={50}
                      onChange={(v) =>
                        applyToSelection({
                          shadow: new fabric.Shadow({ ...activeShadow.toObject(), offsetY: v }),
                        })
                      }
                    />
                  </>
                )}
              </Section>
            </>
          )}

          {/* Layers */}
          <Section title={`Layers (${objects.length})`}>
            {objects.length === 0 && (
              <p className="text-[11px] text-neutral-600">Canvas is empty.</p>
            )}
            <div className="space-y-1">
              {objects
                .slice()
                .reverse()
                .map((o, i) => {
                  const meta = objectMeta(o);
                  const Icon = meta.Icon;
                  const isSel =
                    o === active ||
                    (isMulti && (active as fabric.ActiveSelection).getObjects().includes(o));
                  const hidden = o.visible === false;
                  return (
                    <div
                      key={`layer-${objects.length - i}`}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                        isSel
                          ? "bg-neutral-900 border-neutral-700"
                          : "bg-black border-neutral-900 hover:border-neutral-800"
                      }`}
                      onClick={() => {
                        const cv = fabricRef.current;
                        if (!cv) return;
                        cv.setActiveObject(o);
                        cv.requestRenderAll();
                        setActiveObj(o);
                      }}
                    >
                      <Icon className="w-3 h-3 text-neutral-500 shrink-0" />
                      <span
                        className={`flex-1 text-[11px] truncate ${
                          hidden ? "text-neutral-600 line-through" : "text-neutral-300"
                        }`}
                      >
                        {meta.label}
                      </span>
                      <button
                        type="button"
                        title="Move up"
                        onClick={(e) => {
                          e.stopPropagation();
                          reorder("forward", o);
                        }}
                        className="p-0.5 text-neutral-600 hover:text-white cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="Move down"
                        onClick={(e) => {
                          e.stopPropagation();
                          reorder("backward", o);
                        }}
                        className="p-0.5 text-neutral-600 hover:text-white cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title={hidden ? "Show" : "Hide"}
                        onClick={(e) => {
                          e.stopPropagation();
                          const cv = fabricRef.current;
                          if (!cv) return;
                          o.set({ visible: o.visible === false });
                          if (o.visible === false && o === active) {
                            cv.discardActiveObject();
                            setActiveObj(null);
                          }
                          cv.requestRenderAll();
                          scheduleHistory();
                          forceRender();
                        }}
                        className="p-0.5 text-neutral-600 hover:text-white cursor-pointer"
                      >
                        {hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        type="button"
                        title="Delete layer"
                        onClick={(e) => {
                          e.stopPropagation();
                          const cv = fabricRef.current;
                          if (!cv) return;
                          cv.remove(o);
                          if (o === active) {
                            cv.discardActiveObject();
                            setActiveObj(null);
                          }
                          cv.requestRenderAll();
                        }}
                        className="p-0.5 text-neutral-600 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          </Section>
        </div>
      </div>

      {/* --------------------------- Status bar ------------------------ */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-neutral-900 bg-black text-[10px] font-mono text-neutral-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" /> {objects.length} objects
          </span>
          <span>
            {design.w} × {design.h}px
          </span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <span>
          {active
            ? `Selected: ${objectMeta(active).label}${isLocked ? " (locked)" : ""}`
            : tool === "draw"
              ? "Drawing mode — strokes become editable objects"
              : "Ctrl+wheel to zoom · drag objects to move · snap guides at center"}
        </span>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importJSON}
      />
    </div>
  );
}
