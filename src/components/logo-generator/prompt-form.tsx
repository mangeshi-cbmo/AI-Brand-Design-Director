"use client";

import React, { useState } from "react";
import { Sparkles, Wand2, Palette, Building2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LOGO_STYLES, COLOR_PALETTES, INDUSTRIES } from "@/config/logo-presets";
import { LogoStyle, ColorPalette, GeneratedLogo } from "@/types/logo";

interface PromptFormProps {
  onGenerated: (logo: GeneratedLogo) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
}

export function PromptForm({ onGenerated, isGenerating, setIsGenerating }: PromptFormProps) {
  const [brandName, setBrandName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [style, setStyle] = useState<LogoStyle>("minimalist");
  const [colorPalette, setColorPalette] = useState<ColorPalette>("monochrome");
  const [conceptDescription, setConceptDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setError("Please enter your brand name.");
      return;
    }
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/ai/generate-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName,
          slogan,
          industry,
          style,
          colorPalette,
          conceptDescription,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to generate logo");
      }

      onGenerated(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-white" />
          Brand Details & Style
        </CardTitle>
        <CardDescription>
          Customize your parameters to synthesize logos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs">
              {error}
            </div>
          )}

          {/* Brand Name & Slogan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Brand Name *
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full rounded-xl bg-black border border-neutral-800 pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Slogan / Tagline
              </label>
              <input
                type="text"
                placeholder="e.g. Build the future"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full rounded-xl bg-black border border-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Industry Selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" /> Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-xl bg-black border border-neutral-800 px-4 py-2 text-sm text-white focus:border-white focus:outline-none transition-all"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} className="bg-black text-white">
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Style Presets */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
              Logo Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {LOGO_STYLES.map((st) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setStyle(st.id)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                    style === st.id
                      ? "bg-white text-black border-white"
                      : "bg-black border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  <div className={`text-xs font-semibold ${style === st.id ? "text-black" : "text-white"}`}>
                    {st.label}
                  </div>
                  <div className={`text-[11px] mt-1 line-clamp-1 ${style === st.id ? "text-neutral-700" : "text-neutral-500"}`}>
                    {st.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color Palettes */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-neutral-400" /> Color Palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {COLOR_PALETTES.map((cp) => (
                <button
                  type="button"
                  key={cp.id}
                  onClick={() => setColorPalette(cp.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    colorPalette === cp.id
                      ? "bg-neutral-900 border-white text-white"
                      : "bg-black border-neutral-800 text-neutral-400 hover:border-neutral-700"
                  }`}
                >
                  <span className="text-xs font-medium">{cp.label}</span>
                  <div className="flex gap-1">
                    {cp.colors.map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5 rounded-full border border-black/50"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Concept Instructions */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
              Specific Concept / Symbol (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Minimal geometric lettermark with sharp negative space"
              value={conceptDescription}
              onChange={(e) => setConceptDescription(e.target.value)}
              className="w-full rounded-xl bg-black border border-neutral-800 px-4 py-2 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating Logo..." : "Generate Logo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
