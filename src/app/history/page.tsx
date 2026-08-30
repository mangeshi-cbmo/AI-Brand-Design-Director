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
  CheckSquare,
  Square,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GeneratedLogo } from "@/types/logo";
import { formatDate } from "@/lib/utils";
import { PALETTE_SWATCHES } from "@/config/palettes";
import { renderLogoDataToSvg } from "@/lib/ai/svg-renderer";

type SortMode = "newest" | "oldest" | "name";

function LogoThumbnail({
  logo,
  className,
}: {
  logo: GeneratedLogo;
  className?: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (logo.logoData) {
    try {
      const svgHtml = renderLogoDataToSvg(logo.logoData);
      if (svgHtml) {
        return (
          <div
            className={`w-full h-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain ${className || ""}`}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        );
      }
    } catch (err) {
      console.error("Error rendering SVG logo in history:", err);
    }
  }

  if (logo.imageUrl && !imageError) {
    if (logo.imageUrl.trim().startsWith("<svg")) {
      return (
        <div
          className={`w-full h-full flex items-center justify-center p-2 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain ${className || ""}`}
          dangerouslySetInnerHTML={{ __html: logo.imageUrl }}
        />
      );
    }
    return (
      <Image
        src={logo.imageUrl}
        alt={logo.brandName}
        width={300}
        height={300}
        unoptimized
        onError={() => setImageError(true)}
        className={`object-contain max-h-full max-w-full rounded-lg transition-transform duration-300 group-hover:scale-105 ${className || ""}`}
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center p-4">
      <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white font-bold text-lg shadow-inner">
        {logo.brandName.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-xs font-semibold text-neutral-300 truncate max-w-[140px]">
        {logo.brandName}
      </span>
      <span className="text-[10px] font-mono text-neutral-500 capitalize">
        {logo.style.replace(/-/g, " ")}
      </span>
    </div>
  );
}

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
      className="flex items-center gap-3 p-3.5 rounded-xl bg-neutral-950 border border-neutral-900"
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

  // Multi-select & Card Delete Confirmation State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxConfirmDelete, setLightboxConfirmDelete] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

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
    setLightboxConfirmDelete(false);
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

  const isAllSelected = useMemo(
    () => visibleLogos.length > 0 && visibleLogos.every((l) => selectedIds.has(l.id)),
    [visibleLogos, selectedIds]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleLogos.map((l) => l.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  /* Download logo either as SVG or PNG based on available data */
  const downloadLogo = async (logo: GeneratedLogo) => {
    const filename = `${logo.brandName.toLowerCase().replace(/\s+/g, "-")}-logo`;
    
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
        console.error("Error creating PNG from SVG logo:", err);
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

  const downloadSelected = async () => {
    const selectedList = logos.filter((l) => selectedIds.has(l.id));
    for (const logo of selectedList) {
      await downloadLogo(logo);
      // Small delay between downloads to prevent browser throttling
      await new Promise((r) => setTimeout(r, 250));
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

  /* Single logo deletion (triggered after user confirms on card or lightbox) */
  const deleteLogo = async (logo: GeneratedLogo) => {
    setDeletingId(logo.id);
    const prev = logos;
    setLogos((cur) => cur.filter((l) => l.id !== logo.id));
    setPreview((cur) => (cur?.id === logo.id ? null : cur));
    setConfirmDeleteId(null);
    setSelectedIds((prevSet) => {
      const next = new Set(prevSet);
      next.delete(logo.id);
      return next;
    });

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

  /* Bulk logo deletion */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const idsList = Array.from(selectedIds);
    const prev = logos;

    // Optimistic removal
    setLogos((cur) => cur.filter((l) => !selectedIds.has(l.id)));
    if (preview && selectedIds.has(preview.id)) {
      setPreview(null);
    }
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);

    try {
      const res = await fetch("/api/logos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsList }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Bulk delete failed");
    } catch (err) {
      console.error("Failed to bulk delete logos:", err);
      setLogos(prev);
    } finally {
      setIsBulkDeleting(false);
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
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-20">
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
            Every mark you&apos;ve synthesized — preview, refine, export, or manage them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logos.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                isAllSelected
                  ? "bg-white text-black border-white shadow-sm"
                  : selectedIds.size > 0
                  ? "bg-neutral-900 text-white border-neutral-700"
                  : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isAllSelected ? "Deselect All" : selectedIds.size > 0 ? `Selected (${selectedIds.size})` : "Select All"}</span>
            </button>
          )}

          <Link href="/generate">
            <Button variant="primary" size="sm">
              <Sparkles className="w-4 h-4 mr-1.5" /> Create New Logo
            </Button>
          </Link>
        </div>
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
            {visibleLogos.map((logo, i) => {
              const isSelected = selectedIds.has(logo.id);
              const isConfirmingDelete = confirmDeleteId === logo.id;

              return (
                <motion.div
                  key={logo.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.4), ease: "easeOut" }}
                  className={`group relative rounded-2xl border bg-neutral-950 overflow-hidden transition-all flex flex-col ${
                    isSelected
                      ? "border-white ring-2 ring-white/30 shadow-xl shadow-white/5"
                      : "border-neutral-900 hover:border-neutral-700 hover:shadow-2xl"
                  }`}
                >
                  {/* Selection Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(logo.id);
                    }}
                    title={isSelected ? "Deselect" : "Select"}
                    className={`absolute top-3 left-3 z-10 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? "bg-white text-black ring-2 ring-white/50 opacity-100"
                        : "bg-neutral-950/80 backdrop-blur-md border border-neutral-700 text-neutral-400 opacity-0 group-hover:opacity-100 hover:border-white hover:text-white"
                    } ${selectedIds.size > 0 ? "!opacity-100" : ""}`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 opacity-60" />
                    )}
                  </button>

                  {/* Preview area */}
                  <div className="relative aspect-square bg-neutral-950 bg-[radial-gradient(#232323_1px,transparent_1px)] bg-[size:12px_12px] flex items-center justify-center p-6 border-b border-neutral-900 overflow-hidden">
                    <LogoThumbnail logo={logo} />

                    {/* In-Card Delete Confirmation Overlay */}
                    <AnimatePresence>
                      {isConfirmingDelete && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute inset-0 z-20 bg-neutral-950/95 backdrop-blur-sm p-4 flex flex-col items-center justify-center text-center"
                        >
                          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-white truncate max-w-[180px]">
                            Delete &ldquo;{logo.brandName}&rdquo;?
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 mb-3">
                            This cannot be undone.
                          </p>
                          <div className="flex items-center gap-2 w-full max-w-[190px]">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deletingId === logo.id}
                              onClick={() => deleteLogo(logo)}
                              className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {deletingId === logo.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                "Delete"
                              )}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Hover action bar (hidden during confirmation) */}
                    {!isConfirmingDelete && (
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(logo.id);
                          }}
                          disabled={deletingId === logo.id}
                          title="Delete logo"
                          className="p-2 rounded-lg bg-black/80 backdrop-blur border border-neutral-700 text-neutral-200 hover:bg-rose-600 hover:border-rose-600 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
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
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Floating Bulk Actions Dock */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-2xl bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-2xl shadow-black/90 text-white">
              {/* Selected badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-white">{selectedIds.size}</span>
                <span className="text-neutral-400 hidden sm:inline">selected</span>
              </div>

              <div className="h-5 w-px bg-neutral-800 mx-0.5" />

              {/* Action Buttons */}
              <button
                type="button"
                onClick={selectAll}
                className="px-2.5 py-1.5 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </button>

              <button
                type="button"
                onClick={downloadSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({selectedIds.size})</span>
              </button>

              {!showBulkDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedIds.size})</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 p-1 rounded-xl bg-rose-950/40 border border-rose-900/50 animate-in fade-in zoom-in-95 duration-100">
                  <span className="text-xs text-rose-300 font-medium pl-2">
                    Delete {selectedIds.size} items?
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="py-1 px-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBulkDeleting}
                    onClick={handleBulkDelete}
                    className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1"
                  >
                    {isBulkDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={clearSelection}
                title="Close bar"
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col md:flex-row"
            >
              {/* Big preview */}
              <div className="w-full md:w-1/2 aspect-square max-h-[320px] md:max-h-none bg-neutral-950 flex items-center justify-center p-6 sm:p-8 border-b md:border-b-0 md:border-r border-neutral-900 shrink-0">
                <LogoThumbnail logo={preview} className="max-w-[360px] max-h-[360px]" />
              </div>

              {/* Details */}
              <div className="md:w-1/2 p-5 sm:p-6 flex flex-col justify-between">
                <div>
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
                </div>

                {/* Lightbox Actions with Delete Confirmation */}
                <div className="mt-5 pt-3 border-t border-neutral-900">
                  {lightboxConfirmDelete ? (
                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-center animate-in fade-in zoom-in-95 duration-100">
                      <p className="text-xs font-semibold text-rose-200 mb-1">
                        Permanently delete this logo?
                      </p>
                      <p className="text-[11px] text-neutral-400 mb-3">
                        This action cannot be undone.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setLightboxConfirmDelete(false)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === preview.id}
                          onClick={() => deleteLogo(preview)}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-medium transition-colors cursor-pointer shadow-sm"
                        >
                          {deletingId === preview.id ? "Deleting..." : "Confirm Delete"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
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
                        onClick={() => setLightboxConfirmDelete(true)}
                        title="Delete"
                        className="p-2 rounded-xl border border-neutral-800 text-neutral-400 hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-900 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
