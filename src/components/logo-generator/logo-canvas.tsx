"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Download, Sparkles, Copy, Check, Eye, Edit3 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedLogo } from "@/types/logo";
import { formatDate } from "@/lib/utils";

interface LogoCanvasProps {
  logo: GeneratedLogo | null;
  isGenerating: boolean;
  onOpenEditor?: () => void;
}

export function LogoCanvas({ logo, isGenerating, onOpenEditor }: LogoCanvasProps) {
  const [copied, setCopied] = useState(false);
  const [bgMode, setBgMode] = useState<"dark" | "light" | "grid">("dark");

  const handleCopyPrompt = () => {
    if (!logo?.promptUsed) return;
    navigator.clipboard.writeText(logo.promptUsed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!logo?.imageUrl) return;
    const a = document.createElement("a");
    a.href = logo.imageUrl;
    a.download = `${logo.brandName.toLowerCase().replace(/\s+/g, "-")}-logo.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Card className="w-full h-full flex flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-white" />
              Preview
            </CardTitle>
            <CardDescription>
              {logo ? `Rendered for ${logo.brandName}` : "Generated visual preview"}
            </CardDescription>
          </div>
          {logo && (
            <Badge variant="white" className="capitalize">
              {logo.style.replace("-", " ")}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center py-6">
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
          {isGenerating ? (
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-white">Synthesizing logo mark...</p>
              <p className="text-xs text-neutral-500">Vector layout & typography</p>
            </div>
          ) : logo ? (
            <div className="relative w-full h-full flex items-center justify-center p-6">
              <Image
                src={logo.imageUrl}
                alt={logo.brandName}
                width={360}
                height={360}
                unoptimized
                className="object-contain rounded-xl"
              />
            </div>
          ) : (
            <div className="text-center px-6 py-12">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-3 text-neutral-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-neutral-300">Ready to create</h4>
              <p className="text-xs text-neutral-500 mt-1 max-w-[200px] mx-auto">
                Fill in your brand parameters to generate.
              </p>
            </div>
          )}
        </div>

        {/* Action buttons & prompt inspector */}
        {logo && (
          <div className="w-full mt-6 space-y-3">
            {/* Open in Canvas Editor CTA */}
            {onOpenEditor && (
              <Button onClick={onOpenEditor} variant="primary" className="w-full">
                <Edit3 className="w-4 h-4 mr-2" />
                Edit in Canvas Editor
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={handleDownload} variant="secondary" className="flex-1 text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download PNG
              </Button>
              <Button onClick={handleCopyPrompt} variant="secondary" className="text-xs">
                {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
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
