"use client";

import React, { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import {
  Download,
  Type,
  Square,
  Circle,
  RotateCw,
  Maximize2,
  Trash2,
  Layers,
  Sparkles,
  Palette,
  Minus,
  Plus,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneratedLogo } from "@/types/logo";

interface LogoEditorProps {
  logo: GeneratedLogo | null;
  onClose?: () => void;
}

const FONTS = [
  { name: "Inter (Modern Sans)", value: "Inter, sans-serif" },
  { name: "Playfair (Luxury Serif)", value: "Georgia, serif" },
  { name: "Space Mono (Cyber)", value: "monospace" },
  { name: "Impact (Bold Display)", value: "Impact, sans-serif" },
  { name: "Arial (Clean)", value: "Arial, sans-serif" },
];

export function LogoEditor({ logo, onClose }: LogoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<fabric.FabricObject | null>(null);

  // Styling state
  const [bgColor, setBgColor] = useState<string>("transparent");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [fontFamily, setFontFamily] = useState<string>(FONTS[0].value);
  const [fontSize, setFontSize] = useState<number>(36);
  const [activeTab, setActiveTab] = useState<"text" | "shapes" | "background" | "adjust">("text");

  // Initialize Fabric Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 500,
      height: 500,
      backgroundColor: bgColor === "transparent" ? undefined : bgColor,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;

    canvas.on("selection:created", (e) => setSelectedObject(e.selected ? e.selected[0] : null));
    canvas.on("selection:updated", (e) => setSelectedObject(e.selected ? e.selected[0] : null));
    canvas.on("selection:cleared", () => setSelectedObject(null));

    // Load initial logo image onto canvas if available
    if (logo?.imageUrl) {
      fabric.FabricImage.fromURL(logo.imageUrl, {
        crossOrigin: "anonymous",
      })
        .then((img) => {
          if (!fabricCanvasRef.current) return;
          // Scale to fit nicely in center
          img.scaleToWidth(280);
          img.set({
            left: (500 - (img.getScaledWidth() || 280)) / 2,
            top: 70,
            cornerColor: "#ffffff",
            cornerStrokeColor: "#000000",
            cornerSize: 10,
            transparentCorners: false,
          });
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);

          // Add default brand name text under logo
          const brandText = new fabric.IText(logo.brandName.toUpperCase(), {
            left: 250,
            top: 380,
            originX: "center",
            originY: "center",
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: "bold",
            fill: "#ffffff",
            charSpacing: 100,
            cornerColor: "#ffffff",
            cornerSize: 8,
          });

          fabricCanvasRef.current.add(brandText);
          fabricCanvasRef.current.renderAll();
        })
        .catch((err) => console.error("Error loading logo onto canvas:", err));
    }

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [logo]);

  // Update canvas background color
  const handleBgChange = (color: string) => {
    setBgColor(color);
    if (!fabricCanvasRef.current) return;

    if (color === "transparent") {
      fabricCanvasRef.current.backgroundColor = "";
    } else {
      fabricCanvasRef.current.backgroundColor = color;
    }
    fabricCanvasRef.current.renderAll();
  };

  // Add new text element
  const handleAddText = (content: string, isHeadline = false) => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.IText(content, {
      left: 250,
      top: isHeadline ? 380 : 420,
      originX: "center",
      originY: "center",
      fontFamily,
      fontSize: isHeadline ? 32 : 18,
      fontWeight: isHeadline ? "bold" : "normal",
      fill: textColor,
      cornerColor: "#ffffff",
      cornerSize: 8,
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  // Add geometric shape
  const handleAddShape = (type: "rect" | "circle" | "frame") => {
    if (!fabricCanvasRef.current) return;

    let shape: fabric.FabricObject;

    if (type === "circle") {
      shape = new fabric.Circle({
        radius: 60,
        fill: "transparent",
        stroke: "#ffffff",
        strokeWidth: 2,
        left: 250,
        top: 250,
        originX: "center",
        originY: "center",
      });
    } else if (type === "frame") {
      shape = new fabric.Rect({
        width: 440,
        height: 440,
        fill: "transparent",
        stroke: "#ffffff",
        strokeWidth: 2,
        left: 250,
        top: 250,
        originX: "center",
        originY: "center",
        rx: 16,
        ry: 16,
      });
    } else {
      shape = new fabric.Rect({
        width: 120,
        height: 120,
        fill: "transparent",
        stroke: "#ffffff",
        strokeWidth: 2,
        left: 250,
        top: 250,
        originX: "center",
        originY: "center",
      });
    }

    fabricCanvasRef.current.add(shape);
    fabricCanvasRef.current.setActiveObject(shape);
    fabricCanvasRef.current.renderAll();
  };

  // Update selected object text properties
  const updateSelectedProperty = (key: string, value: any) => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    selectedObject.set(key as any, value);
    fabricCanvasRef.current.renderAll();
  };

  // Delete selected object
  const handleDeleteSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    fabricCanvasRef.current.remove(selectedObject);
    fabricCanvasRef.current.discardActiveObject();
    fabricCanvasRef.current.renderAll();
    setSelectedObject(null);
  };

  // Center selected object
  const handleCenterSelected = () => {
    if (!fabricCanvasRef.current || !selectedObject) return;
    fabricCanvasRef.current.centerObject(selectedObject);
    selectedObject.setCoords();
    fabricCanvasRef.current.renderAll();
  };

  // Export full resolution image
  const handleExport = (format: "png" | "transparent") => {
    if (!fabricCanvasRef.current) return;

    // Temporarily ensure background if transparent desired
    const originalBg = fabricCanvasRef.current.backgroundColor;
    if (format === "transparent") {
      fabricCanvasRef.current.backgroundColor = "";
    }

    fabricCanvasRef.current.renderAll();

    const dataUrl = fabricCanvasRef.current.toDataURL({
      format: "png",
      multiplier: 2, // 2x high-res export (1000x1000px)
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${(logo?.brandName || "custom-logo").toLowerCase().replace(/\s+/g, "-")}-edited.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Restore background
    fabricCanvasRef.current.backgroundColor = originalBg;
    fabricCanvasRef.current.renderAll();
  };

  return (
    <div className="w-full rounded-2xl border border-neutral-900 bg-neutral-950 p-6 space-y-6 shadow-2xl">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-white" />
            Interactive Canvas Editor
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Resize, reposition, adjust colors, typography & framing elements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => handleExport("png")} variant="primary" size="sm">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export High-Res PNG
          </Button>
          <Button onClick={() => handleExport("transparent")} variant="secondary" size="sm">
            Transparent PNG
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Interactive Canvas Viewport */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-xl bg-black border border-neutral-900">
          <div
            className={`relative rounded-xl overflow-hidden shadow-2xl ${
              bgColor === "transparent"
                ? "bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:16px_16px]"
                : ""
            }`}
            style={{ backgroundColor: bgColor !== "transparent" ? bgColor : undefined }}
          >
            <canvas ref={canvasRef} />
          </div>

          {/* Quick Object Manipulation Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleCenterSelected}
              disabled={!selectedObject}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
            >
              <Maximize2 className="w-3 h-3" /> Center
            </button>
            <button
              onClick={() => {
                if (selectedObject) {
                  selectedObject.rotate((selectedObject.angle || 0) + 15);
                  fabricCanvasRef.current?.renderAll();
                }
              }}
              disabled={!selectedObject}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
            >
              <RotateCw className="w-3 h-3" /> Rotate 15&deg;
            </button>
            <button
              onClick={handleDeleteSelected}
              disabled={!selectedObject}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-rose-950 text-neutral-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>

        {/* Right: Customization Tool Panel */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Tool Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-black border border-neutral-900">
            <button
              onClick={() => setActiveTab("text")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "text" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setActiveTab("shapes")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "shapes" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Shapes
            </button>
            <button
              onClick={() => setActiveTab("background")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "background" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Canvas
            </button>
            <button
              onClick={() => setActiveTab("adjust")}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === "adjust" ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
              }`}
            >
              Layers
            </button>
          </div>

          {/* TAB 1: TEXT TOOLS */}
          {activeTab === "text" && (
            <div className="p-4 rounded-xl bg-black border border-neutral-900 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleAddText(logo?.brandName || "BRAND NAME", true)}
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                >
                  <Type className="w-3.5 h-3.5 mr-1" />
                  + Headline
                </Button>
                <Button
                  onClick={() => handleAddText("Innovate The Future", false)}
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                >
                  <Type className="w-3.5 h-3.5 mr-1" />
                  + Tagline
                </Button>
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
                  Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e) => {
                    setFontFamily(e.target.value);
                    updateSelectedProperty("fontFamily", e.target.value);
                  }}
                  className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-white focus:border-white focus:outline-none"
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-black text-white">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size & Weight */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
                    Font Size
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const newSize = Math.max(12, fontSize - 4);
                        setFontSize(newSize);
                        updateSelectedProperty("fontSize", newSize);
                      }}
                      className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="flex-1 text-center font-mono text-xs text-white">{fontSize}px</span>
                    <button
                      onClick={() => {
                        const newSize = Math.min(100, fontSize + 4);
                        setFontSize(newSize);
                        updateSelectedProperty("fontSize", newSize);
                      }}
                      className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-400 mb-1.5">
                    Text Color
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => {
                        setTextColor(e.target.value);
                        updateSelectedProperty("fill", e.target.value);
                      }}
                      className="w-8 h-8 rounded-lg border border-neutral-800 bg-black cursor-pointer"
                    />
                    <span className="text-xs font-mono text-neutral-300">{textColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHAPES & FRAMES */}
          {activeTab === "shapes" && (
            <div className="p-4 rounded-xl bg-black border border-neutral-900 space-y-4">
              <label className="block text-[11px] font-mono uppercase text-neutral-400">
                Add Framing Element
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => handleAddShape("circle")} variant="secondary" size="sm">
                  <Circle className="w-3.5 h-3.5 mr-1" /> Circle
                </Button>
                <Button onClick={() => handleAddShape("rect")} variant="secondary" size="sm">
                  <Square className="w-3.5 h-3.5 mr-1" /> Square
                </Button>
                <Button onClick={() => handleAddShape("frame")} variant="secondary" size="sm">
                  <Layers className="w-3.5 h-3.5 mr-1" /> Frame
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: BACKGROUND COLOR */}
          {activeTab === "background" && (
            <div className="p-4 rounded-xl bg-black border border-neutral-900 space-y-4">
              <label className="block text-[11px] font-mono uppercase text-neutral-400">
                Canvas Background
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleBgChange("transparent")}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    bgColor === "transparent"
                      ? "bg-white text-black border-white"
                      : "bg-black border-neutral-800 text-neutral-400"
                  }`}
                >
                  Transparent
                </button>
                <button
                  onClick={() => handleBgChange("#000000")}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    bgColor === "#000000"
                      ? "bg-white text-black border-white"
                      : "bg-black border-neutral-800 text-neutral-400"
                  }`}
                >
                  Black (#000)
                </button>
                <button
                  onClick={() => handleBgChange("#ffffff")}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all ${
                    bgColor === "#ffffff"
                      ? "bg-neutral-200 text-black border-white"
                      : "bg-neutral-900 border-neutral-800 text-neutral-400"
                  }`}
                >
                  White (#FFF)
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LAYER ORDERING */}
          {activeTab === "adjust" && (
            <div className="p-4 rounded-xl bg-black border border-neutral-900 space-y-3">
              <label className="block text-[11px] font-mono uppercase text-neutral-400">
                Layer Controls
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    if (selectedObject) {
                      fabricCanvasRef.current?.bringObjectToFront(selectedObject);
                      fabricCanvasRef.current?.renderAll();
                    }
                  }}
                  disabled={!selectedObject}
                  variant="secondary"
                  size="sm"
                >
                  Bring to Front
                </Button>
                <Button
                  onClick={() => {
                    if (selectedObject) {
                      fabricCanvasRef.current?.sendObjectToBack(selectedObject);
                      fabricCanvasRef.current?.renderAll();
                    }
                  }}
                  disabled={!selectedObject}
                  variant="secondary"
                  size="sm"
                >
                  Send to Back
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
