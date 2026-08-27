"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowLeft,
  Download,
  Calendar,
  Layers,
  Search,
  Trash2,
  Edit3,
  Eye,
  Copy,
  Check,
  X,
  Palette,
  Shapes,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeneratedLogo } from "@/types/logo";
import { formatDate } from "@/lib/utils";
import { PALETTE_SWATCHES } from "@/config/palettes";

type SortMode = "newest" | "oldest" | "name";

function PaletteDots({ palette }: { palette?: string }) {
  const colors = palette ? PALETTE_SWATCHES[palette] : undefined;
  if (!colors) return null;
  return (
    <span className="inline-flex items-center -space-x-0.5" title={palette}>
      {colors.map((c, i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full ring-1 ring-black/70"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="flex items-center gap-3 p-3.5 rounded-xl bg-[#0a0a0a] border border-neutral-900"
    >
      <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-neutral-300" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{value}</p>
        <p className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{label}</p>
      </div>
    </motion.div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logos, setLogos] = useState<GeneratedLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [styleFilter, setStyleFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [preview, setPreview] = useState<GeneratedLogo | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (status === "authenticated") {
      async function fetchLogos() {
        try {
          const res = await fetch("/api/logos");
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setLogos(json.data);
          }
        } catch (err) {
          console.error("Failed to load history:", err);
        } finally {
          setLoading(false);
        }
      }
      fetchLogos();
    }
  }, [status, router]);

  /* Close the preview lightbox with Escape */
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const styles = useMemo(
    () => Array.from(new Set(logos.map((l) => l.style))).sort(),
    [logos]
  );

  const visibleLogos = useMemo(() => {
    let list = logos;
    if (styleFilter !== "all") list = list.filter((l) => l.style === styleFilter);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((l) => l.brandName.toLowerCase().includes(q));
    const sorted = [...list];
    if (sortMode === "newest") {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortMode === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      sorted.sort((a, b) => a.brandName.localeCompare(b.brandName));
    }
    return sorted;
  }, [logos, query, styleFilter, sortMode]);

  const uniqueBrands = useMemo(
    () => new Set(logos.map((l) => l.brandName.toLowerCase())).size,
    [logos]
  );

  /* Cross-origin `download` attributes are ignored by browsers — fetch to a
     blob so the file actually downloads instead of opening in a tab. */
  const downloadLogo = async (logo: GeneratedLogo) => {
    const filename = `${logo.brandName.toLowerCase().replace(/\s+/g, "-")}-logo.png`;
    try {
      const blob = await (await fetch(logo.imageUrl)).blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(logo.imageUrl, "_blank", "noopener");
    }
  };

  /* Hand the logo to the studio's canvas editor via a one-shot session key */
  const openInEditor = (logo: GeneratedLogo) => {
    try {
      sessionStorage.setItem("logoforge:open-logo", JSON.stringify(logo));
    } catch {
      /* storage unavailable — the studio just opens without a preloaded logo */
    }
    router.push("/generate");
  };

  const deleteLogo = async (logo: GeneratedLogo) => {
    if (!window.confirm(`Delete the "${logo.brandName}" logo? This cannot be undone.`)) return;
    setDeletingId(logo.id);
    const prev = logos;
    setLogos((cur) => cur.filter((l) => l.id !== logo.id));
    setPreview((cur) => (cur?.id === logo.id ? null : cur));
    try {
      const res = await fetch(`/api/logos?id=${encodeURIComponent(logo.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
    } catch (err) {
      console.error("Failed to delete logo:", err);
      setLogos(prev);
    } finally {
      setDeletingId(null);
    }
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 1600);
  };

  if (status === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const latest = logos.length
    ? formatDate(
        logos.reduce((a, b) =>
          new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime() ? a : b
        ).createdAt
      )
    : "—";

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <Link
            href="/generate"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Studio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-neutral-300" />
            My Logo Gallery
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Every mark you&apos;ve synthesized — preview, refine, export, or retire them.
          </p>
        </div>

        <Link href="/generate">
          <Button variant="primary" size="sm">
            <Sparkles className="w-4 h-4 mr-1.5" /> Create New Logo
          </Button>
        </Link>
      </div>

      {/* Stats strip */}
      {!loading && logos.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <StatTile icon={Layers} label="Total Marks" value={String(logos.length)} delay={0} />
          <StatTile icon={Shapes} label="Styles Explored" value={String(styles.length)} delay={0.06} />
          <StatTile icon={Palette} label="Brands" value={String(uniqueBrands)} delay={0.12} />
          <StatTile icon={Clock} label="Latest" value={latest} delay={0.18} />
        </div>
      )}

      {/* Toolbar: search, style filter, sort */}
      {!loading && logos.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand name..."
              className="w-full rounded-xl bg-neutral-950 border border-neutral-800 pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-600 focus:border-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setStyleFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
                styleFilter === "all"
                  ? "bg-white text-black border-white font-semibold"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              All
            </button>
            {styles.map((s) => (
              <button
                key={s}
                onClick={() => setStyleFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono capitalize border transition-colors cursor-pointer ${
                  styleFilter === s
                    ? "bg-white text-black border-white font-semibold"
                    : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                }`}
              >
                {s.replace(/-/g, " ")}
              </button>
            ))}
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="lg:ml-auto rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-2 text-xs text-neutral-300 focus:border-neutral-500 focus:outline-none cursor-pointer"
          >
            <option value="newest" className="bg-black">Newest first</option>
            <option value="oldest" className="bg-black">Oldest first</option>
            <option value="name" className="bg-black">Brand A–Z</option>
          </select>
        </div>
      )}

      {/* Content */}
      {loading ? (
        /* Skeleton grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-neutral-900 bg-neutral-950 overflow-hidden"
            >
              <div className="aspect-square bg-neutral-900/60 animate-pulse" />
              <div className="p-4 space-y-2.5">
                <div className="h-3.5 w-2/3 rounded bg-neutral-900 animate-pulse" />
                <div className="h-2.5 w-1/2 rounded bg-neutral-900/70 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : logos.length === 0 ? (
        /* Empty state */
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="text-center py-20 px-4 border-neutral-900 bg-neutral-950">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-neutral-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Your gallery is empty</h3>
            <p className="text-sm text-neutral-400 mt-1.5 max-w-sm mx-auto">
              Chat with the Brand Architect to synthesize your first logo — it will land here
              automatically.
            </p>
            <div className="mt-6">
              <Link href="/generate">
                <Button variant="primary">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Open the Studio
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      ) : visibleLogos.length === 0 ? (
        /* No search/filter results */
        <div className="text-center py-16 text-neutral-500">
          <Search className="w-5 h-5 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No logos match your search.</p>
          <button
            onClick={() => {
              setQuery("");
              setStyleFilter("all");
            }}
            className="text-xs text-neutral-300 hover:text-white underline underline-offset-2 mt-2 cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        /* Logo grid */
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
        >
          <AnimatePresence>
            {visibleLogos.map((logo, i) => (
              <motion.div
                key={logo.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: "easeOut" }}
                className="group rounded-2xl border border-neutral-900 bg-neutral-950 overflow-hidden hover:border-neutral-700 hover:shadow-2xl transition-all flex flex-col"
              >
                {/* Preview area */}
                <div className="relative aspect-square bg-neutral-950 bg-[radial-gradient(#232323_1px,transparent_1px)] bg-[size:12px_12px] flex items-center justify-center p-6 border-b border-neutral-900 overflow-hidden">
                  <Image
                    src={logo.imageUrl}
                    alt={logo.brandName}
                    width={240}
                    height={240}
                    unoptimized
                    className="object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover action bar */}
                  <div className="absolute inset-x-0 bottom-0 p-3 flex items-center justify-center gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
                    <button
                      onClick={() => setPreview(logo)}
                      title="Preview"
                      className="p-2 rounded-lg bg-black/80 backdrop-blur border border-neutral-700 text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openInEditor(logo)}
                      title="Open in Canvas Editor"
                      className="p-2 rounded-lg bg-black/80 backdrop-blur border border-neutral-700 text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => downloadLogo(logo)}
                      title="Download PNG"
                      className="p-2 rounded-lg bg-black/80 backdrop-blur border border-neutral-700 text-neutral-200 hover:bg-white hover:text-black transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteLogo(logo)}
                      disabled={deletingId === logo.id}
                      title="Delete"
                      className="p-2 rounded-lg bg-black/80 backdrop-blur border border-neutral-700 text-neutral-200 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card meta */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-white text-sm truncate">{logo.brandName}</h4>
                    <PaletteDots palette={logo.colorPalette} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-900">
                    <span className="font-mono capitalize truncate">
                      {logo.style.replace(/-/g, " ")}
                    </span>
                    <span className="flex items-center gap-1 font-mono shrink-0">
                      <Calendar className="w-3 h-3" />
                      {formatDate(logo.createdAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Preview lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-[#0c0c0c] shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Big preview */}
              <div className="md:w-1/2 aspect-square bg-neutral-950 bg-[radial-gradient(#232323_1px,transparent_1px)] bg-[size:14px_14px] flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-neutral-900">
                <Image
                  src={preview.imageUrl}
                  alt={preview.brandName}
                  width={380}
                  height={380}
                  unoptimized
                  className="object-contain rounded-xl"
                />
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-5 sm:p-6 flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{preview.brandName}</h3>
                    <p className="text-[11px] font-mono text-neutral-500 mt-0.5 flex items-center gap-2">
                      <span className="capitalize">{preview.style.replace(/-/g, " ")}</span>
                      <PaletteDots palette={preview.colorPalette} />
                    </p>
                  </div>
                  <button
                    onClick={() => setPreview(null)}
                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] font-mono text-neutral-600 mt-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Created {formatDate(preview.createdAt)}
                </p>

                {preview.promptUsed && (
                  <div className="mt-4 p-3 rounded-xl bg-black border border-neutral-900 flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">
                        Synthesis Prompt
                      </span>
                      <button
                        onClick={() => copyPrompt(preview.promptUsed)}
                        className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> copy
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed max-h-32 overflow-y-auto chat-scroll">
                      {preview.promptUsed}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-5">
                  <Button
                    onClick={() => openInEditor(preview)}
                    variant="primary"
                    size="sm"
                    className="flex-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Open in Editor
                  </Button>
                  <Button onClick={() => downloadLogo(preview)} variant="secondary" size="sm">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> PNG
                  </Button>
                  <button
                    onClick={() => deleteLogo(preview)}
                    title="Delete"
                    className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-900 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
