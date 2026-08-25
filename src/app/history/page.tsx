"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Sparkles, ArrowLeft, Download, Calendar, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedLogo } from "@/types/logo";
import { formatDate } from "@/lib/utils";

export default function HistoryPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logos, setLogos] = useState<GeneratedLogo[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/generate"
            className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Studio
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Generated Logo Gallery</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Browse all branding assets created and saved in your database.
          </p>
        </div>

        <Link href="/generate">
          <Button variant="primary" size="sm">
            <Sparkles className="w-4 h-4 mr-1.5" /> Create New Logo
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-neutral-500">
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm">Fetching logos from database...</p>
        </div>
      ) : logos.length === 0 ? (
        <Card className="text-center py-16 px-4 border-neutral-900 bg-neutral-950">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4 text-neutral-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">No logos created yet</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm mx-auto">
            Head over to the Studio to generate your first AI logo concept.
          </p>
          <div className="mt-6">
            <Link href="/generate">
              <Button variant="primary">Go to Studio</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {logos.map((logo) => (
            <Card key={logo.id} className="overflow-hidden group flex flex-col justify-between border-neutral-900 bg-neutral-950">
              <div className="relative aspect-square bg-black flex items-center justify-center p-6 border-b border-neutral-900">
                <Image
                  src={logo.imageUrl}
                  alt={logo.brandName}
                  width={240}
                  height={240}
                  unoptimized
                  className="object-contain rounded-lg"
                />
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm truncate">{logo.brandName}</h4>
                  <Badge variant="default" className="text-[10px]">
                    {logo.style}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-900">
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3" />
                    {formatDate(logo.createdAt)}
                  </span>
                  <a
                    href={logo.imageUrl}
                    download={`${logo.brandName}-logo.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white hover:underline flex items-center gap-1 font-medium"
                  >
                    <Download className="w-3.5 h-3.5" /> Save
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
