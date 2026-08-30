"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download, Copy, Check, Eye, Edit3, Compass, FileCode, Sun, Moon, Grid } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedLogo } from "@/types/logo";
import { renderLogoDataToSvg } from "@/lib/ai/svg-renderer";
import { formatDate } from "@/lib/utils";

interface LogoCanvasProps {
  logo: GeneratedLogo | null;
  isGenerating: boolean;
  onOpenEditor?: () => void;
}

export function LogoCanvas({ logo, isGenerating, onOpenEditor }: LogoCanvasProps) {
  const [copied, setCopied] = useState(false);
  const [bgMode, setBgMode] = useState<"dark" | "light" | "grid">("dark");
  const [imgError, setImgError] = useState(false);

  const handleCopyPrompt = () => {
    if (!logo?.promptUsed) return;
    navigator.clipboard.writeText(logo.promptUsed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = async () => {
    if (!logo) return;
    const filename = `${(logo.brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-logo`;

    if (logo.logoData) {
      try {
        const svgStr = renderLogoDataToSvg(logo.logoData);
        const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
        const URL = window.URL || window.webkitURL || window;
        const blobURL = URL.createObjectURL(svgBlob);
        const image = new window.Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 1024;
          canvas.height = 1024;
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(image, 0, 0, 1024, 1024);
            const pngUrl = canvas.toDataURL("image/png");
            const a = document.createElement("a");
            a.download = `${filename}.png`;
            a.href = pngUrl;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          URL.revokeObjectURL(blobURL);
        };
        image.src = blobURL;
        return;
      } catch (err) {
        console.error("Error creating PNG from SVG logo in canvas:", err);
      }
    }

    if (logo.imageUrl) {
      try {
        const blob = await (await fetch(logo.imageUrl)).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        window.open(logo.imageUrl, "_blank", "noopener");
      }
    }
  };

  const handleDownloadSvg = () => {
    if (!logo?.logoData) return;
    const svgStr = renderLogoDataToSvg(logo.logoData);
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(logo.brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-logo.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /** Render the SVG preview inline when logoData is available */
  const renderPreview = () => {
    if (logo?.logoData) {
      try {
        const svgStr = renderLogoDataToSvg(logo.logoData);
        if (svgStr) {
          return (
            <div
              className="relative w-full h-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain select-none"
              dangerouslySetInnerHTML={{ __html: svgStr }}
            />
          );
        }
      } catch (e) {
        console.error("Error rendering SVG in LogoCanvas:", e);
      }
    }

    if (logo?.imageUrl && !imgError) {
      if (logo.imageUrl.trim().startsWith("<svg")) {
        return (
          <div
            className="relative w-full h-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:object-contain select-none"
            dangerouslySetInnerHTML={{ __html: logo.imageUrl }}
          />
        );
      }
      return (
        <div className="relative w-full h-full flex items-center justify-center p-2">
          <Image
            src={logo.imageUrl}
            alt={logo.brandName || "Logo"}
            width={400}
            height={400}
            unoptimized
            onError={() => setImgError(true)}
            className="object-contain max-h-full max-w-full rounded-xl transition-transform duration-300"
          />
        </div>
      );
    }

    // Fallback monogram
    if (logo?.brandName) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold text-xl shadow-inner">
            {logo.brandName.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">
            {logo.brandName}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white" />
              Live Preview
            </CardTitle>
            <CardDescription>
              {logo ? `Rendered for ${logo.brandName}` : "Generated visual mark"}
            </CardDescription>
          </div>
          {logo && (
            <div className="flex items-center gap-1.5">
              {logo.logoData && (
                <Badge variant="white" className="text-[10px]">
                  SVG
                </Badge>
              )}
              <Badge variant="white" className="capitalize">
                {(logo.style || "custom").replace(/-/g, " ")}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center py-4">
        {/* Canvas Display */}
        <div
          className={`relative w-full max-w-sm aspect-square rounded-2xl flex items-center justify-center border transition-all overflow-hidden ${
            bgMode === "dark"
              ? "bg-black border-neutral-900"
              : bgMode === "light"
              ? "bg-white border-neutral-200"
              : "bg-neutral-950 border-neutral-800 bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:16px_16px]"
          }`}
        >
          {/* Background Toggle Controls */}
          {logo && !isGenerating && (
            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 p-1 rounded-lg bg-neutral-950/80 backdrop-blur-sm border border-neutral-800 shadow-md">
              <button
                type="button"
                onClick={() => setBgMode("dark")}
                title="Dark Background"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  bgMode === "dark" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Moon className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setBgMode("light")}
                title="Light Background"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  bgMode === "light" ? "bg-white text-black font-bold shadow-sm" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Sun className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setBgMode("grid")}
                title="Grid Background"
                className={`p-1 rounded transition-colors cursor-pointer ${
                  bgMode === "grid" ? "bg-neutral-800 text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Grid className="w-3 h-3" />
              </button>
            </div>
          )}

          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-white">Synthesizing logo concepts...</p>
              <p className="text-xs text-neutral-500">Vector SVG generation</p>
            </div>
          ) : logo ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
              {renderPreview()}
            </div>
          ) : (
            <div className="text-center px-6 py-12">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                <Compass className="w-5 h-5 text-neutral-400" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300">Ready to synthesize</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-[200px] mx-auto">
                Chat with the Architect to generate your editable brand logo.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons & prompt inspector */}
        {logo && !isGenerating && (
          <div className="w-full mt-5 space-y-2.5">
            {/* Open in Canvas Editor CTA */}
            {onOpenEditor && (
              <Button onClick={onOpenEditor} variant="primary" className="w-full">
                <Edit3 className="w-4 h-4 mr-2" />
                <span>Edit in Canvas Editor</span>
              </Button>
            )}

            <div className="flex gap-2">
              {logo.logoData && (
                <Button onClick={handleDownloadSvg} variant="secondary" className="flex-1 text-xs">
                  <FileCode className="w-3.5 h-3.5 mr-1.5" />
                  SVG
                </Button>
              )}
              <Button onClick={handleDownloadPng} variant="secondary" className="flex-1 text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                PNG
              </Button>
              <Button onClick={handleCopyPrompt} variant="secondary" className="text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="ml-1">{copied ? "Copied" : "Prompt"}</span>
              </Button>
            </div>

            <div className="p-3 rounded-xl bg-black border border-neutral-900 text-xs text-neutral-400 font-mono">
              <div className="flex justify-between items-center text-[10px] text-neutral-500 uppercase tracking-wider mb-1 font-mono">
                <span>Prompt</span>
                <span>{formatDate(logo.createdAt)}</span>
              </div>
              <p className="line-clamp-2">{logo.promptUsed}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
