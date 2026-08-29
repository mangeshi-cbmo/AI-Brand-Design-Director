"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { X, Check, Ban, BookOpen, FileDown, FileCode2 } from "lucide-react";
import { BrandGuidelines } from "@/types/brand";
import { GeneratedLogo } from "@/types/logo";
import { hexToRgb } from "@/config/brand-kit";
import { downloadGuidelinesHtml, downloadGuidelinesPdf } from "@/lib/brand-guidelines-html";
import { renderLogoDataToSvg, renderLogoIconSvg } from "@/lib/ai/svg-renderer";
import { formatDate } from "@/lib/utils";

interface GuidelinesProps {
  guidelines: BrandGuidelines;
  logo: GeneratedLogo | null;
}

/* Numbered section header — the backbone of the fixed template */
function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[11px] font-mono text-neutral-600">{index}</span>
      <h3 className="text-sm font-semibold text-white uppercase tracking-[0.18em]">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-neutral-800 to-transparent" />
    </div>
  );
}

/**
 * Universal logo/mark renderer for the guidelines document.
 * Correctly handles both structured SVG logos (with transparent bg and surface adaptation)
 * and legacy PNG image URLs.
 */
function MarkImage({
  logo,
  className,
  variant = "icon",
}: {
  logo: GeneratedLogo | null;
  className?: string;
  variant?: "icon" | "full" | "on-light" | "on-dark";
}) {
  const svgMarkup = useMemo(() => {
    if (!logo?.logoData) return null;
    try {
      if (variant === "on-light") {
        return renderLogoIconSvg(logo.logoData, { onLight: true });
      }
      if (variant === "on-dark") {
        return renderLogoIconSvg(logo.logoData, { onDark: true });
      }
      if (variant === "full") {
        return renderLogoDataToSvg(logo.logoData, { transparentBg: true });
      }
      return renderLogoIconSvg(logo.logoData, { onDark: true });
    } catch (e) {
      console.error("Error rendering mark SVG in guidelines:", e);
      return null;
    }
  }, [logo, variant]);

  if (!logo) return null;

  if (svgMarkup) {
    return (
      <div
        className={`flex items-center justify-center shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain ${className || "h-16 w-16"}`}
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    );
  }

  if (logo.imageUrl) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${className || "h-16 w-16"}`}>
        <Image
          src={logo.imageUrl}
          alt={logo.brandName}
          width={160}
          height={160}
          unoptimized
          className="object-contain max-h-full max-w-full"
        />
      </div>
    );
  }

  return null;
}

/* Download the document as print-ready PDF or self-contained HTML */
export function GuidelinesActions({ guidelines, logo }: GuidelinesProps) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => downloadGuidelinesPdf(guidelines, logo)}
        title="Opens a print-ready document — choose 'Save as PDF' in the dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
      >
        <FileDown className="w-3.5 h-3.5" />
        Download PDF
      </button>
      <button
        onClick={() => downloadGuidelinesHtml(guidelines, logo)}
        title="Self-contained HTML document — opens in any browser"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 text-[11px] hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
      >
        <FileCode2 className="w-3.5 h-3.5" />
        HTML
      </button>
    </div>
  );
}

/**
 * The brand guidelines document body — the fixed 6-section template.
 * Rendered inside the chat modal and the studio "Brand Kit" tab.
 */
export function BrandGuidelinesDocument({ guidelines, logo }: GuidelinesProps) {
  const headingFont = { fontFamily: guidelines.typography.heading.css };
  const bodyFont = { fontFamily: guidelines.typography.body.css };
  const brandUpper = guidelines.brandName.toUpperCase();

  return (
    <div className="px-6 sm:px-10 py-8 space-y-10">
      {/* Cover */}
      <div className="text-center py-8 border border-neutral-900 rounded-2xl bg-[radial-gradient(ellipse_at_top,#141414,transparent_70%)]">
        <div className="flex justify-center mb-5">
          <MarkImage logo={logo} variant="icon" className="h-24 w-24" />
        </div>
        <h1
          className="text-3xl sm:text-4xl font-bold text-white uppercase tracking-[0.22em]"
          style={headingFont}
        >
          {brandUpper}
        </h1>
        {guidelines.slogan && (
          <p className="mt-2.5 text-sm text-neutral-400 italic" style={bodyFont}>
            “{guidelines.slogan}”
          </p>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="px-2.5 py-1 rounded-md border border-neutral-800 text-neutral-400">
            {guidelines.industry}
          </span>
          <span className="px-2.5 py-1 rounded-md border border-neutral-800 text-neutral-400 capitalize">
            {guidelines.style.replace(/-/g, " ")}
          </span>
        </div>
      </div>

      {/* 01 — Brand Overview */}
      <section className="space-y-4">
        <SectionHeader index="01" title="Brand Overview" />
        <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl" style={bodyFont}>
          {guidelines.story}
        </p>
        <div className="flex flex-wrap gap-2">
          {guidelines.personality.map((trait, i) => (
            <span
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-800 bg-[#111111] text-xs text-neutral-200"
            >
              <span className="text-[9px] font-mono text-neutral-600">0{i + 1}</span>
              {trait}
            </span>
          ))}
        </div>
      </section>

      {/* 02 — Logo Suite */}
      <section className="space-y-4">
        <SectionHeader index="02" title="Logo Suite" />
        <div className="grid grid-cols-2 gap-3">
          {/* Primary horizontal lockup */}
          <div className="col-span-2 rounded-xl border border-neutral-800 bg-neutral-950 bg-[radial-gradient(#1c1c1c_1px,transparent_1px)] bg-[size:14px_14px] h-44 flex items-center justify-center gap-5 relative px-6">
            <MarkImage logo={logo} variant="icon" className="h-16 w-16" />
            <span
              className="text-2xl font-bold text-white uppercase tracking-[0.2em]"
              style={headingFont}
            >
              {brandUpper}
            </span>
            <span className="absolute bottom-2.5 left-3.5 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Primary Lockup · Horizontal · 3:1
            </span>
          </div>

          {/* Stacked lockup */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-48 flex flex-col items-center justify-center gap-3.5 relative px-4">
            <MarkImage logo={logo} variant="icon" className="h-16 w-16" />
            <span
              className="text-sm font-bold text-white uppercase tracking-[0.22em] text-center"
              style={headingFont}
            >
              {brandUpper}
            </span>
            <span className="absolute bottom-2.5 left-3.5 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Stacked · 4:5
            </span>
          </div>

          {/* Icon only */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 h-48 flex items-center justify-center relative">
            <div className="w-20 h-20 rounded-2xl border border-neutral-800 bg-[#111111] flex items-center justify-center p-2">
              <MarkImage logo={logo} variant="icon" className="h-14 w-14" />
            </div>
            <span className="absolute bottom-2.5 left-3.5 text-[9px] font-mono text-neutral-600 uppercase tracking-wider">
              Icon Only · App & Favicon · 1:1
            </span>
          </div>

          {/* On light */}
          <div className="col-span-2 rounded-xl border border-neutral-800 bg-[#fafafa] h-36 flex items-center justify-center gap-5 relative px-6">
            <MarkImage logo={logo} variant="on-light" className="h-14 w-14" />
            <span
              className="text-xl font-bold text-neutral-900 uppercase tracking-[0.2em]"
              style={headingFont}
            >
              {brandUpper}
            </span>
            <span className="absolute bottom-2.5 left-3.5 text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
              On Light Surfaces · 3:1
            </span>
          </div>
        </div>
      </section>

      {/* 03 — Clear Space & Minimum Size */}
      <section className="space-y-4">
        <SectionHeader index="03" title="Clear Space & Minimum Size" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col items-center justify-center gap-4">
            <div className="border border-dashed border-neutral-600 rounded-lg p-8 relative flex items-center justify-center">
              <MarkImage logo={logo} variant="icon" className="h-14 w-14" />
              <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-500">
                ¼×
              </span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono text-neutral-500">
                ¼×
              </span>
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-neutral-500">
                ¼×
              </span>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-neutral-500">
                ¼×
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Always keep clear space equal to one quarter of the mark&apos;s width (¼×) free on
              all sides. No text or graphics may enter this zone.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col items-center justify-center gap-4">
            <div className="flex items-end gap-6">
              <div className="flex flex-col items-center gap-1.5">
                <MarkImage logo={logo} variant="icon" className="h-14 w-14" />
                <span className="text-[9px] font-mono text-neutral-500">56 px</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <MarkImage logo={logo} variant="icon" className="h-8 w-8" />
                <span className="text-[9px] font-mono text-neutral-500">32 px</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 text-center leading-relaxed">
              Minimum reproduction size: 32 px on screen, 12 mm in print. Below this, use the
              icon-only variant.
            </p>
          </div>
        </div>
      </section>

      {/* 04 — Color Palette */}
      <section className="space-y-4">
        <SectionHeader index="04" title="Color Palette" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {guidelines.colors.map((color) => (
            <div
              key={color.role}
              className="rounded-xl border border-neutral-800 bg-[#101010] overflow-hidden"
            >
              <div
                className="h-16 w-full border-b border-neutral-800"
                style={{ backgroundColor: color.hex }}
              />
              <div className="p-3 space-y-1">
                <p className="text-xs font-semibold text-white truncate">{color.name}</p>
                <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
                  {color.role}
                </p>
                <p className="text-[10px] font-mono text-neutral-300 uppercase">{color.hex}</p>
                <p className="text-[9px] font-mono text-neutral-500">rgb({hexToRgb(color.hex)})</p>
                <p className="text-[10px] text-neutral-400 leading-snug pt-0.5">{color.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 05 — Typography */}
      <section className="space-y-4">
        <SectionHeader index="05" title="Typography" />
        <div className="grid sm:grid-cols-2 gap-3">
          {(
            [
              ["Heading Typeface", guidelines.typography.heading],
              ["Body Typeface", guidelines.typography.body],
            ] as const
          ).map(([label, face]) => (
            <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 flex gap-5">
              <span
                className="text-5xl text-white leading-none shrink-0"
                style={{ fontFamily: face.css, fontWeight: label === "Heading Typeface" ? 700 : 400 }}
              >
                Aa
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-white truncate">{face.family}</p>
                <p className="text-[10px] font-mono text-neutral-400">{face.weight}</p>
                <p className="text-[10px] text-neutral-500">{face.usage}</p>
                <p
                  className="text-[11px] text-neutral-300 pt-1.5 break-all leading-relaxed"
                  style={{ fontFamily: face.css }}
                >
                  ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 06 — Usage Rules */}
      <section className="space-y-4">
        <SectionHeader index="06" title="Usage Rules" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/10 p-5 space-y-3">
            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Do</p>
            {guidelines.dos.map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-neutral-300 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/10 p-5 space-y-3">
            <p className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">Don&apos;t</p>
            {guidelines.donts.map((rule, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <Ban className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-xs text-neutral-300 leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="pt-2 pb-4 border-t border-neutral-900 flex items-center justify-between text-[10px] font-mono text-neutral-600">
        <span>Generated by LogoForge AI · {formatDate(new Date())}</span>
        <span className="uppercase tracking-wider">{guidelines.brandName} Identity System</span>
      </div>
    </div>
  );
}

interface BrandGuidelinesModalProps extends GuidelinesProps {
  onClose: () => void;
}

export function BrandGuidelinesModal({ guidelines, logo, onClose }: BrandGuidelinesModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl"
      >
        {/* Document header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-900 bg-[#0a0a0a]/95 backdrop-blur">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-neutral-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {guidelines.brandName} — Brand Guidelines
              </p>
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                Identity System · Fixed Template v1
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <GuidelinesActions guidelines={guidelines} logo={logo} />
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <BrandGuidelinesDocument guidelines={guidelines} logo={logo} />
      </motion.div>
    </div>
  );
}
