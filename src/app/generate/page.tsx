"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare, Edit3, ArrowLeft } from "lucide-react";
import { AgentChat } from "@/components/logo-generator/agent-chat";
import { LogoCanvas } from "@/components/logo-generator/logo-canvas";
import { LogoEditor } from "@/components/canvas-editor/logo-editor";
import { GeneratedLogo } from "@/types/logo";

export default function GenerateStudioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentLogo, setCurrentLogo] = useState<GeneratedLogo | null>(null);
  const [activeView, setActiveView] = useState<"studio" | "editor">("studio");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Studio Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {activeView === "studio" ? "Logo Studio" : "Canvas Editor"}
          </h1>
          <p className="text-sm text-neutral-400 mt-0.5">
            {activeView === "studio"
              ? "Chat with your AI Brand Architect to generate unique logo marks."
              : "Customize typography, resize elements, adjust colors & framing on the canvas."}
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-900">
          <button
            onClick={() => setActiveView("studio")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === "studio"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Agent Chat</span>
          </button>

          <button
            onClick={() => setActiveView("editor")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === "editor"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Canvas Editor</span>
            {currentLogo && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: AGENT CHAT + LIVE PREVIEW */}
      {activeView === "studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <AgentChat
              onLogoGenerated={(logo) => {
                setCurrentLogo(logo);
              }}
            />
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <LogoCanvas
              logo={currentLogo}
              isGenerating={false}
              onOpenEditor={() => setActiveView("editor")}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: FULL INTERACTIVE CANVAS EDITOR */}
      {activeView === "editor" && (
        <div className="space-y-4">
          <LogoEditor
            logo={currentLogo}
            onClose={() => setActiveView("studio")}
          />
        </div>
      )}
    </div>
  );
}
