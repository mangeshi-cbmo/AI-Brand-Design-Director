"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode,
  FileJson,
  Grid3X3,
  Layers,
  Lock,
  LockOpen,
  Maximize2,
  Minus,
  Move,
  Palette,
  Plus,
  Redo2,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
} from "lucide-react";
import { LogoData, LogoLayer, LogoPaletteColor, LogoFont } from "@/types/logo";
import { loadLogoFonts, LOGO_FONTS } from "@/lib/fonts/font-loader";

/* ------------------------------------------------------------------ */
/* Types & constants                                                    */
/* ------------------------------------------------------------------ */

interface SvgLogoEditorProps {
  logoData: LogoData;
  onClose?: () => void;
}

interface HistoryEntry {
  layers: LogoLayer[];
  backgroundColor: string;
}

const SWATCHES = [
  "#FFFFFF", "#F5F5F5", "#D4D4D4", "#A3A3A3", "#737373",
  "#525252", "#262626", "#171717", "#0A0A0A", "#000000",
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#EC4899", "#F43F5E", "#B91C1C", "#92400E", "#1E3A8A",
];

const CANVAS_SIZES = [
  { label: "Logo 500×500", w: 500, h: 500 },
  { label: "Square 1080×1080", w: 1080, h: 1080 },
  { label: "Wide 1500×500", w: 1500, h: 500 },
  { label: "HD 1920×1080", w: 1920, h: 1080 },
];

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export function SvgLogoEditor({ logoData, onClose }: SvgLogoEditorProps) {
  // Core state
  const [layers, setLayers] = useState<LogoLayer[]>(() =>
    logoData.layers.map((l) => ({ ...l }))
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(logoData.backgroundColor);
  const [canvasWidth, setCanvasWidth] = useState(logoData.canvasWidth);
  const [canvasHeight, setCanvasHeight] = useState(logoData.canvasHeight);
  const [palette, setPalette] = useState<LogoPaletteColor[]>([...logoData.colorPalette]);
  const [fontRecs] = useState<LogoFont[]>([...logoData.fontRecommendations]);

  // UI state
  const [zoom, setZoom] = useState(1);
  const [activePanel, setActivePanel] = useState<"layers" | "palette" | null>("layers");
  const [showGrid, setShowGrid] = useState(false);
  const [exportDropdown, setExportDropdown] = useState(false);
  const [, setFontsLoaded] = useState(false);
  const [lockAspect, setLockAspect] = useState(true);

  // History (undo/redo)
  const [history, setHistory] = useState<HistoryEntry[]>([
    { layers: logoData.layers.map((l) => ({ ...l })), backgroundColor: logoData.backgroundColor },
  ]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Drag & Resize state
  const [dragInfo, setDragInfo] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [resizeInfo, setResizeInfo] = useState<{
    layerId: string;
    handle: "nw" | "ne" | "se" | "sw";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
    origFontSize?: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Font loading
  useEffect(() => {
    loadLogoFonts(layers, fontRecs).then(() => setFontsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fit zoom
  const zoomToFit = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / canvasWidth;
    const scaleY = (clientHeight - 80) / canvasHeight;
    setZoom(Math.max(0.1, Math.min(scaleX, scaleY, 1.5)));
  }, [canvasWidth, canvasHeight]);

  useEffect(() => {
    zoomToFit();
  }, [zoomToFit]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportDropdown(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [exportDropdown]);

  // Selected layer helper
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  /* ---------------------------------------------------------------- */
  /* History                                                            */
  /* ---------------------------------------------------------------- */
  const pushHistory = useCallback(
    (newLayers: LogoLayer[], newBg?: string) => {
      const entry: HistoryEntry = {
        layers: newLayers.map((l) => ({ ...l })),
        backgroundColor: newBg ?? backgroundColor,
      };
      const trimmed = history.slice(0, historyIdx + 1);
      trimmed.push(entry);
      if (trimmed.length > 50) trimmed.shift();
      setHistory(trimmed);
      setHistoryIdx(trimmed.length - 1);
    },
    [history, historyIdx, backgroundColor]
  );

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setLayers(prev.layers.map((l) => ({ ...l })));
    setBackgroundColor(prev.backgroundColor);
    setHistoryIdx(historyIdx - 1);
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setLayers(next.layers.map((l) => ({ ...l })));
    setBackgroundColor(next.backgroundColor);
    setHistoryIdx(historyIdx + 1);
  }, [history, historyIdx]);

  /* ---------------------------------------------------------------- */
  /* Layer CRUD & Transforms                                            */
  /* ---------------------------------------------------------------- */
  const updateLayer = useCallback(
    (id: string, patch: Partial<LogoLayer>) => {
      setLayers((prev) => {
        const next = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const scaleLayer = useCallback(
    (id: string, multiplier: number) => {
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          const newW = Math.max(10, Math.round(l.width * multiplier));
          const newH = Math.max(10, Math.round(l.height * multiplier));
          const patch: Partial<LogoLayer> = { width: newW, height: newH };
          if (l.type === "text" && l.fontSize) {
            patch.fontSize = Math.max(6, Math.round(l.fontSize * multiplier));
          }
          return { ...l, ...patch };
        });
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const setLayerWidth = useCallback(
    (id: string, newW: number) => {
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          const clampedW = Math.max(5, Math.round(newW));
          if (lockAspect && l.width > 0) {
            const ratio = clampedW / l.width;
            const newH = Math.max(5, Math.round(l.height * ratio));
            const patch: Partial<LogoLayer> = { width: clampedW, height: newH };
            if (l.type === "text" && l.fontSize) {
              patch.fontSize = Math.max(6, Math.round(l.fontSize * ratio));
            }
            return { ...l, ...patch };
          }
          return { ...l, width: clampedW };
        });
        pushHistory(next);
        return next;
      });
    },
    [lockAspect, pushHistory]
  );

  const setLayerHeight = useCallback(
    (id: string, newH: number) => {
      setLayers((prev) => {
        const next = prev.map((l) => {
          if (l.id !== id) return l;
          const clampedH = Math.max(5, Math.round(newH));
          if (lockAspect && l.height > 0) {
            const ratio = clampedH / l.height;
            const newW = Math.max(5, Math.round(l.width * ratio));
            const patch: Partial<LogoLayer> = { width: newW, height: clampedH };
            if (l.type === "text" && l.fontSize) {
              patch.fontSize = Math.max(6, Math.round(l.fontSize * ratio));
            }
            return { ...l, ...patch };
          }
          return { ...l, height: clampedH };
        });
        pushHistory(next);
        return next;
      });
    },
    [lockAspect, pushHistory]
  );

  const deleteLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        const next = prev.filter((l) => l.id !== id);
        pushHistory(next);
        return next;
      });
      if (selectedLayerId === id) setSelectedLayerId(null);
    },
    [pushHistory, selectedLayerId]
  );

  const duplicateLayer = useCallback(
    (id: string) => {
      setLayers((prev) => {
        const src = prev.find((l) => l.id === id);
        if (!src) return prev;
        const dup: LogoLayer = {
          ...src,
          id: `${src.id}-copy-${Date.now()}`,
          label: `${src.label} (copy)`,
          x: src.x + 20,
          y: src.y + 20,
        };
        const next = [...prev, dup];
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  const addTextLayer = useCallback(() => {
    const newLayer: LogoLayer = {
      id: `text-${Date.now()}`,
      type: "text",
      label: "New Text",
      content: "Brand Text",
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 220,
      height: 60,
      fill: palette.find((c) => c.role === "text")?.hex || "#ffffff",
      fontFamily: fontRecs[0]?.family || "Inter",
      fontSize: 36,
      fontWeight: 700,
      letterSpacing: 0,
      textAnchor: "middle",
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
    };
    setLayers((prev) => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedLayerId(newLayer.id);
  }, [canvasWidth, canvasHeight, palette, fontRecs, pushHistory]);

  const addShapeLayer = useCallback(() => {
    const newLayer: LogoLayer = {
      id: `shape-${Date.now()}`,
      type: "shape",
      label: "Circle Shape",
      svgPath: "M50 5 A45 45 0 1 0 50 95 A45 45 0 1 0 50 5 Z",
      viewBox: "0 0 100 100",
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 120,
      height: 120,
      fill: palette.find((c) => c.role === "primary")?.hex || "#3B82F6",
      opacity: 1,
      rotation: 0,
      visible: true,
      locked: false,
    };
    setLayers((prev) => {
      const next = [...prev, newLayer];
      pushHistory(next);
      return next;
    });
    setSelectedLayerId(newLayer.id);
  }, [canvasWidth, canvasHeight, palette, pushHistory]);

  const moveLayerOrder = useCallback(
    (id: string, direction: "up" | "down") => {
      setLayers((prev) => {
        const idx = prev.findIndex((l) => l.id === id);
        if (idx === -1) return prev;
        const next = [...prev];
        const swapIdx = direction === "up" ? idx + 1 : idx - 1;
        if (swapIdx < 0 || swapIdx >= next.length) return prev;
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        pushHistory(next);
        return next;
      });
    },
    [pushHistory]
  );

  /* ---------------------------------------------------------------- */
  /* Background                                                         */
  /* ---------------------------------------------------------------- */
  const updateBackground = useCallback(
    (color: string) => {
      setBackgroundColor(color);
      pushHistory(layers, color);
    },
    [layers, pushHistory]
  );

  /* ---------------------------------------------------------------- */
  /* Drag & Interactive Scale on Canvas                                 */
  /* ---------------------------------------------------------------- */
  const handleResizePointerDown = (
    e: React.PointerEvent,
    layer: LogoLayer,
    handle: "nw" | "ne" | "se" | "sw"
  ) => {
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    setResizeInfo({
      layerId: layer.id,
      handle,
      startX: svgPt.x,
      startY: svgPt.y,
      origX: layer.x,
      origY: layer.y,
      origW: layer.width,
      origH: layer.height,
      origFontSize: layer.fontSize,
    });

    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      const target = e.target as SVGElement;
      if (target.getAttribute("data-handle-ui") === "true") {
        return; // Handled by handleResizePointerDown
      }

      const layerEl = target.closest("[data-layer-id]") as SVGElement | null;
      if (!layerEl) {
        setSelectedLayerId(null);
        return;
      }

      const layerId = layerEl.getAttribute("data-layer-id");
      if (!layerId) return;

      const layer = layers.find((l) => l.id === layerId);
      if (!layer || layer.locked) {
        setSelectedLayerId(layerId);
        return;
      }

      setSelectedLayerId(layerId);

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

      setDragInfo({
        layerId,
        startX: svgPt.x,
        startY: svgPt.y,
        origX: layer.x,
        origY: layer.y,
      });

      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [layers]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Handle interactive corner resize
      if (resizeInfo) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        const dx = svgPt.x - resizeInfo.startX;
        const dy = svgPt.y - resizeInfo.startY;

        let scale = 1;
        if (resizeInfo.handle === "se") {
          const sx = (resizeInfo.origW + dx) / resizeInfo.origW;
          const sy = (resizeInfo.origH + dy) / resizeInfo.origH;
          scale = Math.max(0.1, (sx + sy) / 2);
        } else if (resizeInfo.handle === "nw") {
          const sx = (resizeInfo.origW - dx) / resizeInfo.origW;
          const sy = (resizeInfo.origH - dy) / resizeInfo.origH;
          scale = Math.max(0.1, (sx + sy) / 2);
        } else if (resizeInfo.handle === "ne") {
          const sx = (resizeInfo.origW + dx) / resizeInfo.origW;
          const sy = (resizeInfo.origH - dy) / resizeInfo.origH;
          scale = Math.max(0.1, (sx + sy) / 2);
        } else if (resizeInfo.handle === "sw") {
          const sx = (resizeInfo.origW - dx) / resizeInfo.origW;
          const sy = (resizeInfo.origH + dy) / resizeInfo.origH;
          scale = Math.max(0.1, (sx + sy) / 2);
        }

        const newW = Math.max(10, Math.round(resizeInfo.origW * scale));
        const newH = Math.max(10, Math.round(resizeInfo.origH * scale));

        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== resizeInfo.layerId) return l;
            const patch: Partial<LogoLayer> = { width: newW, height: newH };
            if (l.type === "text" && resizeInfo.origFontSize) {
              patch.fontSize = Math.max(6, Math.round(resizeInfo.origFontSize * scale));
            }
            return { ...l, ...patch };
          })
        );
        return;
      }

      // Handle layer drag / move
      if (dragInfo) {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgPt = pt.matrixTransform(svg.getScreenCTM()?.inverse());

        const dx = svgPt.x - dragInfo.startX;
        const dy = svgPt.y - dragInfo.startY;

        setLayers((prev) =>
          prev.map((l) =>
            l.id === dragInfo.layerId
              ? { ...l, x: Math.round(dragInfo.origX + dx), y: Math.round(dragInfo.origY + dy) }
              : l
          )
        );
      }
    },
    [dragInfo, resizeInfo]
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (dragInfo || resizeInfo) {
      pushHistory(layers);
    }
    setDragInfo(null);
    setResizeInfo(null);
  }, [dragInfo, resizeInfo, layers, pushHistory]);

  /* ---------------------------------------------------------------- */
  /* Keyboard shortcuts                                                 */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") { e.preventDefault(); undo(); }
        if (e.key === "y") { e.preventDefault(); redo(); }
      }
      if (e.key === "Delete" && selectedLayerId) {
        deleteLayer(selectedLayerId);
      }
      if (e.key === "Escape") {
        setSelectedLayerId(null);
        setExportDropdown(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedLayerId, deleteLayer]);

  /* ---------------------------------------------------------------- */
  /* High-Fidelity Export                                               */
  /* ---------------------------------------------------------------- */
  const buildSvgString = useCallback((transparentBg = false) => {
    const svgEl = svgRef.current;
    if (!svgEl) return "";
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    // Clean out all selection and editing UI
    clone.querySelectorAll("[data-selection-ui]").forEach((el) => el.remove());
    clone.querySelectorAll("[data-grid-ui]").forEach((el) => el.remove());
    clone.querySelectorAll("[data-handle-ui]").forEach((el) => el.remove());

    // CRITICAL: Strip viewport zoom styles & shadows to ensure 100% clean export scale
    clone.removeAttribute("style");
    clone.setAttribute("width", String(canvasWidth));
    clone.setAttribute("height", String(canvasHeight));
    clone.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    if (transparentBg) {
      const bgRect = clone.querySelector("[data-bg-rect]");
      if (bgRect) bgRect.setAttribute("fill", "none");
    }

    return new XMLSerializer().serializeToString(clone);
  }, [canvasWidth, canvasHeight]);

  const exportSvg = useCallback(() => {
    const svgStr = buildSvgString(false);
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(logoData.brandName || "logo").toLowerCase().replace(/\s+/g, "-")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDropdown(false);
  }, [buildSvgString, logoData.brandName]);

  const exportPng = useCallback((multiplier = 2, transparent = false) => {
    const svgStr = buildSvgString(transparent);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth * multiplier;
    canvas.height = canvasHeight * multiplier;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const suffix = transparent ? "-transparent" : multiplier > 1 ? `@${multiplier}x` : "";
      a.download = `${(logoData.brandName || "logo").toLowerCase().replace(/\s+/g, "-")}${suffix}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    setExportDropdown(false);
  }, [buildSvgString, canvasWidth, canvasHeight, logoData.brandName]);

  const exportJpg = useCallback(() => {
    const svgStr = buildSvgString(false);
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth * 2;
    canvas.height = canvasHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = backgroundColor && backgroundColor !== "transparent" ? backgroundColor : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(logoData.brandName || "logo").toLowerCase().replace(/\s+/g, "-")}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    setExportDropdown(false);
  }, [buildSvgString, canvasWidth, canvasHeight, backgroundColor, logoData.brandName]);

  const copyPngToClipboard = useCallback(async () => {
    try {
      const svgStr = buildSvgString(false);
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth * 2;
      canvas.height = canvasHeight * 2;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
      });
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        }
      }, "image/png");
    } catch (err) {
      console.error("Failed to copy image to clipboard", err);
    }
    setExportDropdown(false);
  }, [buildSvgString, canvasWidth, canvasHeight]);

  const exportJson = useCallback(() => {
    const data: LogoData = {
      ...logoData,
      layers,
      backgroundColor,
      canvasWidth,
      canvasHeight,
      colorPalette: palette,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(logoData.brandName || "logo").toLowerCase().replace(/\s+/g, "-")}-logo-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportDropdown(false);
  }, [logoData, layers, backgroundColor, canvasWidth, canvasHeight, palette]);

  /* ---------------------------------------------------------------- */
  /* SVG layer rendering with Interactive Scale Handles                 */
  /* ---------------------------------------------------------------- */
  const renderSelectionHandles = (layer: LogoLayer, translateX: number, translateY: number) => {
    if (layer.id !== selectedLayerId || layer.locked) return null;
    const pad = 6 / zoom;
    const handleSize = 9 / zoom;
    const halfH = handleSize / 2;
    const x1 = translateX - pad;
    const y1 = translateY - pad;
    const w = layer.width + pad * 2;
    const h = layer.height + pad * 2;

    const handles = [
      { id: "nw", cx: x1, cy: y1, cursor: "nwse-resize" },
      { id: "ne", cx: x1 + w, cy: y1, cursor: "nesw-resize" },
      { id: "se", cx: x1 + w, cy: y1 + h, cursor: "nwse-resize" },
      { id: "sw", cx: x1, cy: y1 + h, cursor: "nesw-resize" },
    ];

    return (
      <g data-selection-ui="true">
        {/* Bounding box outline */}
        <rect
          x={x1}
          y={y1}
          width={w}
          height={h}
          fill="none"
          stroke="#3B82F6"
          strokeWidth={1.5 / zoom}
          strokeDasharray={`${5 / zoom} ${3 / zoom}`}
          rx={3 / zoom}
          style={{ pointerEvents: "none" }}
        />
        {/* 4 Interactive Corner Scale Handles */}
        {handles.map((hnd) => (
          <rect
            key={hnd.id}
            data-handle-ui="true"
            data-handle={hnd.id}
            x={hnd.cx - halfH}
            y={hnd.cy - halfH}
            width={handleSize}
            height={handleSize}
            fill="#ffffff"
            stroke="#2563EB"
            strokeWidth={1.5 / zoom}
            rx={2 / zoom}
            style={{ cursor: hnd.cursor, pointerEvents: "all" }}
            onPointerDown={(e) => handleResizePointerDown(e, layer, hnd.id as "nw" | "ne" | "se" | "sw")}
          />
        ))}
      </g>
    );
  };

  const renderSvgLayer = useCallback(
    (layer: LogoLayer) => {
      if (!layer.visible) return null;
      const opacity = layer.opacity;

      if (layer.type === "text") {
        const anchor = layer.textAnchor || "middle";
        const textX = anchor === "middle" ? layer.x : layer.x - layer.width / 2;
        const textY = layer.y;
        const transform = layer.rotation ? `rotate(${layer.rotation}, ${layer.x}, ${layer.y})` : undefined;
        const translateX = layer.x - layer.width / 2;
        const translateY = layer.y - (layer.fontSize || 48) / 2;

        return (
          <g key={layer.id} data-layer-id={layer.id} style={{ cursor: layer.locked ? "default" : "move" }}>
            {/* Hit area */}
            <rect
              x={translateX}
              y={translateY - 8}
              width={layer.width}
              height={(layer.fontSize || 48) + 16}
              fill="transparent"
              stroke="none"
            />
            <text
              x={textX}
              y={textY + (layer.fontSize || 48) * 0.35}
              fill={layer.fill}
              fontFamily={`'${layer.fontFamily || "Inter"}', sans-serif`}
              fontSize={layer.fontSize || 48}
              fontWeight={layer.fontWeight || 700}
              letterSpacing={layer.letterSpacing || 0}
              textAnchor={anchor}
              dominantBaseline="central"
              stroke={layer.stroke}
              strokeWidth={layer.strokeWidth}
              opacity={opacity}
              transform={transform}
              style={{ userSelect: "none", pointerEvents: "auto" }}
            >
              {layer.content || "Text"}
            </text>
            {renderSelectionHandles(layer, translateX, translateY - 8)}
          </g>
        );
      }

      // Icon / Shape layer
      if ((layer.type === "icon" || layer.type === "shape") && layer.svgPath) {
        const viewBox = layer.viewBox || "0 0 100 100";
        const [, , vbW, vbH] = viewBox.split(" ").map(Number);
        const scaleX = layer.width / (vbW || 100);
        const scaleY = layer.height / (vbH || 100);
        const translateX = layer.x - layer.width / 2;
        const translateY = layer.y - layer.height / 2;
        const pathTransform = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scaleY})`;
        const groupTransform = layer.rotation ? `rotate(${layer.rotation}, ${layer.x}, ${layer.y})` : undefined;

        return (
          <g key={layer.id} data-layer-id={layer.id} style={{ cursor: layer.locked ? "default" : "move" }} transform={groupTransform}>
            {/* Hit area */}
            <rect
              x={translateX}
              y={translateY}
              width={layer.width}
              height={layer.height}
              fill="transparent"
              stroke="none"
            />
            <path
              d={layer.svgPath}
              fill={layer.fill}
              stroke={layer.stroke}
              strokeWidth={layer.strokeWidth ? layer.strokeWidth / Math.min(scaleX, scaleY) : undefined}
              opacity={opacity}
              transform={pathTransform}
              style={{ pointerEvents: "auto" }}
            />
            {renderSelectionHandles(layer, translateX, translateY)}
          </g>
        );
      }

      return null;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedLayerId, zoom]
  );

  /* ---------------------------------------------------------------- */
  /* Render UI                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full h-[calc(100vh-160px)] min-h-[620px] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-visible">
      {/* ── Top Toolbar (Clean, No Scrollbar, High Z-Index) ── */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between px-3 sm:px-4 py-2 border-b border-neutral-800 bg-neutral-900/90 gap-2 shrink-0 relative z-30 rounded-t-2xl">
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap">
          {/* Undo / Redo */}
          <ToolBtn icon={<Undo2 className="w-4 h-4" />} label="Undo (Ctrl+Z)" onClick={undo} disabled={historyIdx <= 0} />
          <ToolBtn icon={<Redo2 className="w-4 h-4" />} label="Redo (Ctrl+Y)" onClick={redo} disabled={historyIdx >= history.length - 1} />
          <div className="w-px h-5 bg-neutral-800 mx-1" />

          {/* Add layers */}
          <ToolBtn icon={<Type className="w-4 h-4" />} label="Add Text" onClick={addTextLayer} />
          <ToolBtn icon={<div className="w-4 h-4 rounded-full border-2 border-current" />} label="Add Shape" onClick={addShapeLayer} />
          <div className="w-px h-5 bg-neutral-800 mx-1" />

          {/* View controls */}
          <ToolBtn icon={<Grid3X3 className="w-4 h-4" />} label="Toggle Grid" onClick={() => setShowGrid(!showGrid)} active={showGrid} />
          <ToolBtn icon={<Maximize2 className="w-4 h-4" />} label="Fit Canvas" onClick={zoomToFit} />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Zoom / Scale Toolbar */}
          <div className="flex items-center gap-1 bg-neutral-950 rounded-lg px-2 py-1 border border-neutral-800">
            <button
              onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.1).toFixed(2))))}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span
              onClick={() => setZoom(1)}
              className="text-[11px] font-mono text-neutral-300 w-11 text-center cursor-pointer hover:text-blue-400"
              title="Click to reset 100%"
            >
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export Dropdown with Outside-Click and Full Menu */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportDropdown(!exportDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className={`w-3 h-3 transition-transform ${exportDropdown ? "rotate-180" : ""}`} />
            </button>
            {exportDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl z-50 p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                <ExportItem
                  icon={<FileCode className="w-4 h-4 text-emerald-400" />}
                  label="Download Vector SVG"
                  desc="Infinite scale vector mark"
                  onClick={exportSvg}
                />
                <ExportItem
                  icon={<Download className="w-4 h-4 text-blue-400" />}
                  label="Download PNG (2× High-Res)"
                  desc="Crisp 2000px master"
                  onClick={() => exportPng(2, false)}
                />
                <ExportItem
                  icon={<Sparkles className="w-4 h-4 text-purple-400" />}
                  label="Download PNG (4× Ultra)"
                  desc="4000px ultra high-res"
                  onClick={() => exportPng(4, false)}
                />
                <ExportItem
                  icon={<Download className="w-4 h-4 text-amber-400" />}
                  label="Transparent PNG (2×)"
                  desc="No background"
                  onClick={() => exportPng(2, true)}
                />
                <ExportItem
                  icon={<Download className="w-4 h-4 text-neutral-300" />}
                  label="Download JPG (2×)"
                  desc="Solid background"
                  onClick={exportJpg}
                />
                <div className="border-t border-neutral-800 my-1" />
                <ExportItem
                  icon={<Copy className="w-4 h-4 text-cyan-400" />}
                  label="Copy PNG to Clipboard"
                  desc="Instant paste"
                  onClick={copyPngToClipboard}
                />
                <ExportItem
                  icon={<FileJson className="w-4 h-4 text-neutral-400" />}
                  label="Save Design (.json)"
                  desc="Full editable project data"
                  onClick={exportJson}
                />
              </div>
            )}
          </div>

          {/* Close Editor */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close editor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left: Layers + Palette Panel */}
        <div className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/40 flex flex-col overflow-hidden max-h-48 md:max-h-full">
          {/* Panel tabs */}
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActivePanel("layers")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                activePanel === "layers" ? "text-white bg-neutral-800/50 border-b-2 border-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Layers ({layers.length})
            </button>
            <button
              onClick={() => setActivePanel("palette")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                activePanel === "palette" ? "text-white bg-neutral-800/50 border-b-2 border-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Palette & Canvas
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === "layers" ? (
              <div className="p-3 space-y-1">
                {/* Background item */}
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800/50 mb-2">
                  <div
                    className="w-5 h-5 rounded border border-neutral-700 shrink-0"
                    style={{ backgroundColor }}
                  />
                  <span className="text-[11px] text-neutral-400 flex-1 truncate">Canvas Background</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => updateBackground(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer opacity-0 absolute"
                    style={{ position: "relative", opacity: 1 }}
                  />
                </div>

                {/* Layer list */}
                {[...layers].reverse().map((layer) => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                      selectedLayerId === layer.id
                        ? "bg-blue-500/15 border border-blue-500/30 text-white"
                        : "hover:bg-neutral-800/50 border border-transparent text-neutral-300"
                    }`}
                  >
                    <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                      {layer.type === "text" ? (
                        <Type className="w-3 h-3 text-neutral-400" />
                      ) : (
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.fill }} />
                      )}
                    </div>

                    <span className="text-[11px] flex-1 truncate">{layer.label}</span>

                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-white transition-all cursor-pointer"
                      title={layer.visible ? "Hide layer" : "Show layer"}
                    >
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-white transition-all cursor-pointer"
                      title={layer.locked ? "Unlock layer" : "Lock layer"}
                    >
                      {layer.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <LockOpen className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Palette & Canvas panel */
              <div className="p-3 space-y-3">
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Brand Palette</p>
                <div className="space-y-1.5">
                  {palette.map((color, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 group">
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => {
                          setPalette((prev) => prev.map((c, i) => i === idx ? { ...c, hex: e.target.value } : c));
                        }}
                        className="w-6 h-6 rounded border border-neutral-700 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-neutral-300 truncate">{color.label}</p>
                        <p className="text-[9px] font-mono text-neutral-500">{color.hex}</p>
                      </div>
                      <span className="text-[9px] font-mono text-neutral-600 uppercase">{color.role}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">Quick Swatches</p>
                  <div className="grid grid-cols-10 gap-1">
                    {SWATCHES.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          if (selectedLayer) updateLayer(selectedLayer.id, { fill: color });
                        }}
                        className="w-5 h-5 rounded-sm border border-neutral-700 hover:scale-110 transition-transform cursor-pointer"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">Canvas Preset Size</p>
                  <div className="space-y-1">
                    {CANVAS_SIZES.map((size) => (
                      <button
                        key={size.label}
                        onClick={() => { setCanvasWidth(size.w); setCanvasHeight(size.h); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                          canvasWidth === size.w && canvasHeight === size.h
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 font-medium"
                            : "text-neutral-400 hover:bg-neutral-800/50 border border-transparent"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: SVG Canvas Viewport */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-auto bg-neutral-950 p-6 relative"
          style={{
            backgroundImage: "radial-gradient(circle, #1e1e1e 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div
            style={{
              width: canvasWidth * zoom,
              height: canvasHeight * zoom,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "width 0.15s ease, height 0.15s ease",
            }}
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 25px 50px -12px rgba(0,0,0,0.7)",
                borderRadius: 8,
              }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
            >
              {/* Background */}
              <rect data-bg-rect="true" width={canvasWidth} height={canvasHeight} fill={backgroundColor} rx={0} />

              {/* Grid overlay */}
              {showGrid && (
                <g data-grid-ui="true" opacity={0.2}>
                  <line x1={canvasWidth / 2} y1={0} x2={canvasWidth / 2} y2={canvasHeight} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 4" />
                  <line x1={0} y1={canvasHeight / 2} x2={canvasWidth} y2={canvasHeight / 2} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 4" />
                  {Array.from({ length: Math.floor(canvasWidth / 50) }, (_, i) => (
                    <line key={`gv${i}`} x1={(i + 1) * 50} y1={0} x2={(i + 1) * 50} y2={canvasHeight} stroke="#666" strokeWidth={0.5} />
                  ))}
                  {Array.from({ length: Math.floor(canvasHeight / 50) }, (_, i) => (
                    <line key={`gh${i}`} x1={0} y1={(i + 1) * 50} x2={canvasWidth} y2={(i + 1) * 50} stroke="#666" strokeWidth={0.5} />
                  ))}
                </g>
              )}

              {/* Layers */}
              {layers.map(renderSvgLayer)}
            </svg>
          </div>
        </div>

        {/* Right: Properties & Scale Inspector Panel */}
        <div className="w-72 shrink-0 border-l border-neutral-800 bg-[#0d0d0d] overflow-y-auto">
          {selectedLayer ? (
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    {selectedLayer.type === "text" ? (
                      <Type className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: selectedLayer.fill }} />
                    )}
                  </div>
                  <input
                    value={selectedLayer.label}
                    onChange={(e) => updateLayer(selectedLayer.id, { label: e.target.value })}
                    className="text-sm font-medium text-white bg-transparent border-none outline-none w-full truncate"
                  />
                </div>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => duplicateLayer(selectedLayer.id)} className="p-1 rounded text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer" title="Duplicate">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteLayer(selectedLayer.id)} className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 cursor-pointer" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Text properties ── */}
              {selectedLayer.type === "text" && (
                <>
                  <PropSection label="Content">
                    <input
                      value={selectedLayer.content || ""}
                      onChange={(e) => updateLayer(selectedLayer.id, { content: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white outline-none focus:border-blue-500/50"
                      placeholder="Enter text..."
                    />
                  </PropSection>

                  <PropSection label="Font Family">
                    <select
                      value={selectedLayer.fontFamily || "Inter"}
                      onChange={(e) => {
                        const family = e.target.value;
                        import("@/lib/fonts/font-loader").then((mod) => mod.loadGoogleFont(family));
                        updateLayer(selectedLayer.id, { fontFamily: family });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      {LOGO_FONTS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </PropSection>

                  <PropSection label="Font Size & Weight">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SliderInput
                          value={selectedLayer.fontSize || 48}
                          min={8}
                          max={200}
                          label="px"
                          onChange={(v) => updateLayer(selectedLayer.id, { fontSize: v })}
                        />
                      </div>
                      <div className="w-24">
                        <select
                          value={selectedLayer.fontWeight || 700}
                          onChange={(e) => updateLayer(selectedLayer.id, { fontWeight: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white outline-none cursor-pointer"
                        >
                          {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </PropSection>

                  <PropSection label="Letter Spacing">
                    <SliderInput
                      value={selectedLayer.letterSpacing || 0}
                      min={-10}
                      max={30}
                      label="px"
                      onChange={(v) => updateLayer(selectedLayer.id, { letterSpacing: v })}
                    />
                  </PropSection>
                </>
              )}

              {/* ── Scale & Sizing Controls (Works for shapes, icons & text) ── */}
              <PropSection label="Scale & Dimensions">
                <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800/80 space-y-2.5">
                  {/* Quick Scale Multipliers */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 font-medium">Uniform Scale</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => scaleLayer(selectedLayer.id, 0.9)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 font-mono cursor-pointer transition-colors"
                        title="Scale down 10%"
                      >
                        -10%
                      </button>
                      <button
                        type="button"
                        onClick={() => scaleLayer(selectedLayer.id, 1.1)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 font-mono cursor-pointer transition-colors"
                        title="Scale up 10%"
                      >
                        +10%
                      </button>
                      <button
                        type="button"
                        onClick={() => scaleLayer(selectedLayer.id, 1.25)}
                        className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] text-neutral-300 font-mono cursor-pointer transition-colors"
                        title="Scale up 25%"
                      >
                        +25%
                      </button>
                    </div>
                  </div>

                  {/* Width & Height inputs */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-neutral-500 w-3">W</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.width)}
                        onChange={(e) => setLayerWidth(selectedLayer.id, Number(e.target.value))}
                        className="flex-1 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white outline-none focus:border-blue-500/50 w-0"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-neutral-500 w-3">H</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.height)}
                        onChange={(e) => setLayerHeight(selectedLayer.id, Number(e.target.value))}
                        className="flex-1 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white outline-none focus:border-blue-500/50 w-0"
                      />
                    </div>
                  </div>

                  {/* Aspect Ratio Lock Toggle */}
                  <button
                    type="button"
                    onClick={() => setLockAspect(!lockAspect)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                      lockAspect
                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        : "bg-neutral-950 text-neutral-500 hover:text-neutral-300 border border-neutral-800"
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    {lockAspect ? "Proportional Aspect (Locked)" : "Freeform Aspect (Unlocked)"}
                  </button>
                </div>
              </PropSection>

              {/* ── Position ── */}
              <PropSection label="Position">
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="X" value={selectedLayer.x} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} />
                  <NumberInput label="Y" value={selectedLayer.y} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} />
                </div>
              </PropSection>

              {/* ── Color ── */}
              <PropSection label="Fill Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedLayer.fill}
                    onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                    className="w-8 h-8 rounded-lg border border-neutral-700 cursor-pointer"
                  />
                  <input
                    value={selectedLayer.fill}
                    onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono text-white outline-none"
                  />
                </div>
                <div className="flex gap-1 mt-2">
                  {palette.map((c) => (
                    <button
                      key={c.hex + c.role}
                      onClick={() => updateLayer(selectedLayer.id, { fill: c.hex })}
                      className="w-6 h-6 rounded border border-neutral-700 hover:scale-110 transition-transform cursor-pointer"
                      style={{ backgroundColor: c.hex }}
                      title={`${c.label} (${c.role})`}
                    />
                  ))}
                </div>
              </PropSection>

              {/* ── Opacity & Rotation ── */}
              <PropSection label="Opacity & Rotation">
                <div className="space-y-2">
                  <SliderInput
                    value={Math.round(selectedLayer.opacity * 100)}
                    min={0}
                    max={100}
                    label="%"
                    onChange={(v) => updateLayer(selectedLayer.id, { opacity: v / 100 })}
                  />
                  <SliderInput
                    value={selectedLayer.rotation}
                    min={-180}
                    max={180}
                    label="°"
                    onChange={(v) => updateLayer(selectedLayer.id, { rotation: v })}
                  />
                </div>
              </PropSection>

              {/* ── Layer Order ── */}
              <PropSection label="Layer Stacking">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => moveLayerOrder(selectedLayer.id, "up")}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:border-neutral-700 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" /> Forward
                  </button>
                  <button
                    onClick={() => moveLayerOrder(selectedLayer.id, "down")}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:border-neutral-700 cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" /> Backward
                  </button>
                </div>
              </PropSection>

              {/* ── Center on Canvas ── */}
              <button
                onClick={() =>
                  updateLayer(selectedLayer.id, {
                    x: canvasWidth / 2,
                    y: canvasHeight / 2,
                  })
                }
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors cursor-pointer"
              >
                <AlignCenter className="w-3.5 h-3.5" /> Center on Canvas
              </button>
            </div>
          ) : (
            /* No selection state */
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                <Move className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-300">Select an element</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Click any layer on the canvas to drag, scale corner handles, or customize colors and typography.
              </p>
              <div className="mt-6 w-full space-y-2 pt-4 border-t border-neutral-900">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider text-left">Quick Tips</p>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Proportional Scale</span>
                  <span className="font-mono text-neutral-500">Corner handles</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Undo / Redo</span>
                  <span className="font-mono text-neutral-500">Ctrl+Z / Y</span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Delete layer</span>
                  <span className="font-mono text-neutral-500">Del</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                       */
/* ------------------------------------------------------------------ */

function ToolBtn({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
        active
          ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
          : disabled
          ? "text-neutral-700 cursor-not-allowed"
          : "text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent"
      }`}
    >
      {icon}
    </button>
  );
}

function ExportItem({
  icon,
  label,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white truncate">{label}</p>
        <p className="text-[10px] text-neutral-500 truncate">{desc}</p>
      </div>
    </button>
  );
}

function PropSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function SliderInput({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1 appearance-none bg-neutral-800 rounded-full accent-blue-500 cursor-pointer"
      />
      <span className="text-[11px] font-mono text-neutral-400 w-12 text-right">
        {value}{label}
      </span>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-mono text-neutral-500 w-3">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-white outline-none focus:border-blue-500/50 w-0"
      />
    </div>
  );
}
