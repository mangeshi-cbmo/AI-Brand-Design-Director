"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  ArrowDown,
  ArrowUp,
  Bold,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileJson,
  FlipHorizontal2,
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
  Trash2,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
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
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // History (undo/redo)
  const [history, setHistory] = useState<HistoryEntry[]>([
    { layers: logoData.layers.map((l) => ({ ...l })), backgroundColor: logoData.backgroundColor },
  ]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Drag state
  const [dragInfo, setDragInfo] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Font loading
  useEffect(() => {
    loadLogoFonts(layers, fontRecs).then(() => setFontsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fit zoom
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / canvasWidth;
    const scaleY = (clientHeight - 80) / canvasHeight;
    setZoom(Math.min(scaleX, scaleY, 1));
  }, [canvasWidth, canvasHeight]);

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
  /* Layer CRUD                                                         */
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
      content: "Text",
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      width: 200,
      height: 50,
      fill: palette.find((c) => c.role === "text")?.hex || "#000000",
      fontFamily: fontRecs[0]?.family || "Inter",
      fontSize: 36,
      fontWeight: 600,
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
      width: 100,
      height: 100,
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
  /* Drag on SVG canvas                                                 */
  /* ---------------------------------------------------------------- */
  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;

      // Find clicked layer
      const target = e.target as SVGElement;
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
      if (!dragInfo || !svgRef.current) return;

      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

      const dx = svgPt.x - dragInfo.startX;
      const dy = svgPt.y - dragInfo.startY;

      setLayers((prev) =>
        prev.map((l) =>
          l.id === dragInfo.layerId
            ? { ...l, x: Math.round(dragInfo.origX + dx), y: Math.round(dragInfo.origY + dy) }
            : l
        )
      );
    },
    [dragInfo]
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (dragInfo) {
      pushHistory(layers);
    }
    setDragInfo(null);
  }, [dragInfo, layers, pushHistory]);

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
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, selectedLayerId, deleteLayer]);

  /* ---------------------------------------------------------------- */
  /* Export                                                              */
  /* ---------------------------------------------------------------- */
  const buildSvgString = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return "";
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    // Remove selection UI elements
    clone.querySelectorAll("[data-selection-ui]").forEach((el) => el.remove());
    clone.querySelectorAll("[data-grid-ui]").forEach((el) => el.remove());
    return new XMLSerializer().serializeToString(clone);
  }, []);

  const exportSvg = useCallback(() => {
    const svgStr = buildSvgString();
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
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

  const exportPng = useCallback(() => {
    const svgStr = buildSvgString();
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth * 2;
    canvas.height = canvasHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${(logoData.brandName || "logo").toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgStr)))}`;
    setExportDropdown(false);
  }, [buildSvgString, canvasWidth, canvasHeight, logoData.brandName]);

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
  /* SVG layer rendering                                                */
  /* ---------------------------------------------------------------- */
  const renderSvgLayer = useCallback(
    (layer: LogoLayer) => {
      if (!layer.visible) return null;
      const isSelected = layer.id === selectedLayerId;
      const opacity = layer.opacity;

      if (layer.type === "text") {
        const anchor = layer.textAnchor || "middle";
        const textX = anchor === "middle" ? layer.x : layer.x - layer.width / 2;
        const textY = layer.y;
        const transform = layer.rotation ? `rotate(${layer.rotation}, ${layer.x}, ${layer.y})` : undefined;

        return (
          <g key={layer.id} data-layer-id={layer.id} style={{ cursor: layer.locked ? "default" : "move" }}>
            {/* Hit area */}
            <rect
              x={layer.x - layer.width / 2}
              y={layer.y - (layer.fontSize || 48) / 2 - 8}
              width={layer.width}
              height={(layer.fontSize || 48) + 16}
              fill="transparent"
              stroke="none"
            />
            <text
              x={textX}
              y={textY}
              fill={layer.fill}
              fontFamily={`'${layer.fontFamily || "Inter"}', sans-serif`}
              fontSize={layer.fontSize || 48}
              fontWeight={layer.fontWeight || 700}
              letterSpacing={layer.letterSpacing || 0}
              textAnchor={anchor}
              dominantBaseline="central"
              opacity={opacity}
              transform={transform}
              stroke={layer.stroke}
              strokeWidth={layer.strokeWidth}
              style={{ pointerEvents: "auto" }}
            >
              {layer.content || ""}
            </text>
            {/* Selection outline */}
            {isSelected && (
              <rect
                data-selection-ui="true"
                x={layer.x - layer.width / 2 - 4}
                y={layer.y - (layer.fontSize || 48) / 2 - 12}
                width={layer.width + 8}
                height={(layer.fontSize || 48) + 24}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2 / zoom}
                strokeDasharray={`${4 / zoom}`}
                rx={4 / zoom}
              />
            )}
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
            {isSelected && (
              <rect
                data-selection-ui="true"
                x={translateX - 4 / zoom}
                y={translateY - 4 / zoom}
                width={layer.width + 8 / zoom}
                height={layer.height + 8 / zoom}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2 / zoom}
                strokeDasharray={`${4 / zoom}`}
                rx={4 / zoom}
              />
            )}
          </g>
        );
      }

      return null;
    },
    [selectedLayerId, zoom]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[600px] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
      {/* ── Top Toolbar ── */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-neutral-800 bg-neutral-900/50 overflow-x-auto max-w-full gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Undo / Redo */}
          <ToolBtn icon={<Undo2 className="w-4 h-4" />} label="Undo" onClick={undo} disabled={historyIdx <= 0} />
          <ToolBtn icon={<Redo2 className="w-4 h-4" />} label="Redo" onClick={redo} disabled={historyIdx >= history.length - 1} />
          <div className="w-px h-5 bg-neutral-800 mx-0.5 sm:mx-1" />

          {/* Add layers */}
          <ToolBtn icon={<Type className="w-4 h-4" />} label="Add Text" onClick={addTextLayer} />
          <ToolBtn icon={<div className="w-4 h-4 rounded-full border-2 border-current" />} label="Add Shape" onClick={addShapeLayer} />
          <div className="w-px h-5 bg-neutral-800 mx-0.5 sm:mx-1" />

          {/* View controls */}
          <ToolBtn icon={<Grid3X3 className="w-4 h-4" />} label="Grid" onClick={() => setShowGrid(!showGrid)} active={showGrid} />
          <ToolBtn icon={<Maximize2 className="w-4 h-4" />} label="Fit" onClick={() => {
            if (!containerRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;
            setZoom(Math.min((clientWidth - 80) / canvasWidth, (clientHeight - 80) / canvasHeight, 1));
          }} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-neutral-900 rounded-lg px-2 py-1 border border-neutral-800">
            <button onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))} className="p-0.5 text-neutral-400 hover:text-white cursor-pointer">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-neutral-300 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.1))} className="p-0.5 text-neutral-400 hover:text-white cursor-pointer">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setExportDropdown(!exportDropdown)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
              <ChevronDown className="w-3 h-3" />
            </button>
            {exportDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl z-50 py-1 overflow-hidden">
                <ExportItem icon={<Download className="w-4 h-4" />} label="Download SVG" desc="Vector format" onClick={exportSvg} />
                <ExportItem icon={<Download className="w-4 h-4" />} label="Download PNG" desc="2× resolution" onClick={exportPng} />
                <ExportItem icon={<FileJson className="w-4 h-4" />} label="Export JSON" desc="Editable data" onClick={exportJson} />
              </div>
            )}
          </div>

          {/* Close */}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
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
              Layers
            </button>
            <button
              onClick={() => setActivePanel("palette")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                activePanel === "palette" ? "text-white bg-neutral-800/50 border-b-2 border-white" : "text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              Palette
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === "layers" ? (
              <div className="p-3 space-y-1">
                {/* Background */}
                <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-neutral-900/50 border border-neutral-800/50 mb-2">
                  <div
                    className="w-5 h-5 rounded border border-neutral-700 shrink-0"
                    style={{ backgroundColor }}
                  />
                  <span className="text-[11px] text-neutral-400 flex-1 truncate">Background</span>
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => updateBackground(e.target.value)}
                    className="w-5 h-5 rounded cursor-pointer opacity-0 absolute"
                    style={{ position: "relative", opacity: 1 }}
                  />
                </div>

                {/* Layer list (reversed for visual stacking order) */}
                {[...layers].reverse().map((layer) => (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                      selectedLayerId === layer.id
                        ? "bg-blue-500/10 border border-blue-500/30"
                        : "hover:bg-neutral-800/50 border border-transparent"
                    }`}
                  >
                    {/* Type icon */}
                    <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                      {layer.type === "text" ? (
                        <Type className="w-3 h-3 text-neutral-400" />
                      ) : (
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: layer.fill }} />
                      )}
                    </div>

                    {/* Label */}
                    <span className="text-[11px] text-neutral-300 flex-1 truncate">{layer.label}</span>

                    {/* Visibility + Lock */}
                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-white transition-all cursor-pointer"
                    >
                      {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-500 hover:text-white transition-all cursor-pointer"
                    >
                      {layer.locked ? <Lock className="w-3 h-3" /> : <LockOpen className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Palette panel */
              <div className="p-3 space-y-3">
                <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Brand Colors</p>
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
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2">Canvas Size</p>
                  <div className="space-y-1">
                    {CANVAS_SIZES.map((size) => (
                      <button
                        key={size.label}
                        onClick={() => { setCanvasWidth(size.w); setCanvasHeight(size.h); }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer ${
                          canvasWidth === size.w && canvasHeight === size.h
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
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

        {/* Center: SVG Canvas */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center overflow-auto bg-neutral-950"
          style={{
            backgroundImage: "radial-gradient(circle, #1a1a1a 1px, transparent 1px)",
            backgroundSize: "24px 24px",
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
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 25px 50px -12px rgba(0,0,0,0.5)",
              borderRadius: 8,
            }}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
          >
            {/* Background */}
            <rect width={canvasWidth} height={canvasHeight} fill={backgroundColor} rx={0} />

            {/* Grid overlay */}
            {showGrid && (
              <g data-grid-ui="true" opacity={0.15}>
                {/* Center lines */}
                <line x1={canvasWidth / 2} y1={0} x2={canvasWidth / 2} y2={canvasHeight} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 4" />
                <line x1={0} y1={canvasHeight / 2} x2={canvasWidth} y2={canvasHeight / 2} stroke="#3B82F6" strokeWidth={1} strokeDasharray="4 4" />
                {/* Grid */}
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

        {/* Right: Properties Panel */}
        <div className="w-72 shrink-0 border-l border-neutral-800 bg-[#0d0d0d] overflow-y-auto">
          {selectedLayer ? (
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-neutral-800 flex items-center justify-center">
                    {selectedLayer.type === "text" ? (
                      <Type className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: selectedLayer.fill }} />
                    )}
                  </div>
                  <input
                    value={selectedLayer.label}
                    onChange={(e) => updateLayer(selectedLayer.id, { label: e.target.value })}
                    className="text-sm font-medium text-white bg-transparent border-none outline-none w-full"
                  />
                </div>
                <div className="flex gap-0.5">
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
                          label="Size"
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

              {/* ── Size (icon/shape) ── */}
              {(selectedLayer.type === "icon" || selectedLayer.type === "shape") && (
                <PropSection label="Size">
                  <div className="grid grid-cols-2 gap-2">
                    <NumberInput label="W" value={selectedLayer.width} onChange={(v) => updateLayer(selectedLayer.id, { width: v })} />
                    <NumberInput label="H" value={selectedLayer.height} onChange={(v) => updateLayer(selectedLayer.id, { height: v })} />
                  </div>
                </PropSection>
              )}

              {/* ── Common properties ── */}
              <PropSection label="Position">
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="X" value={selectedLayer.x} onChange={(v) => updateLayer(selectedLayer.id, { x: v })} />
                  <NumberInput label="Y" value={selectedLayer.y} onChange={(v) => updateLayer(selectedLayer.id, { y: v })} />
                </div>
              </PropSection>

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
                {/* Quick palette swatches */}
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

              <PropSection label="Layer Order">
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

              {/* Center button */}
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
            /* No selection */
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3">
                <Move className="w-5 h-5 text-neutral-500" />
              </div>
              <p className="text-sm font-medium text-neutral-300">Select a layer</p>
              <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                Click any element on the canvas or in the layers panel to edit its properties.
              </p>
              <div className="mt-4 w-full space-y-1.5">
                <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">Shortcuts</p>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Undo / Redo</span>
                  <span className="font-mono">Ctrl+Z / Y</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Delete layer</span>
                  <span className="font-mono">Delete</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>Deselect</span>
                  <span className="font-mono">Esc</span>
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
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-neutral-800 transition-colors cursor-pointer"
    >
      <span className="text-neutral-400">{icon}</span>
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        <p className="text-[10px] text-neutral-500">{desc}</p>
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
