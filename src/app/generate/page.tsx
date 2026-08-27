"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare, Edit3, Compass, PanelLeft, BookOpen } from "lucide-react";
import { AgentChat } from "@/components/logo-generator/agent-chat";
import { LogoCanvas } from "@/components/logo-generator/logo-canvas";
import { LogoEditor } from "@/components/canvas-editor/logo-editor";
import {
  BrandGuidelinesDocument,
  GuidelinesActions,
} from "@/components/brand-kit/brand-guidelines";
import { ChatSidebar, ConversationSummary } from "@/components/logo-generator/chat-sidebar";
import { GeneratedLogo } from "@/types/logo";
import { BrandGuidelines } from "@/types/brand";

export default function GenerateStudioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentLogo, setCurrentLogo] = useState<GeneratedLogo | null>(null);
  const [currentGuidelines, setCurrentGuidelines] = useState<BrandGuidelines | null>(null);
  const [activeView, setActiveView] = useState<"studio" | "editor" | "guidelines">("studio");

  // Sidebar & session state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => `session_${Date.now()}`);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch conversation sessions from MongoDB Atlas
  const fetchConversations = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      setIsLoadingConversations(true);
      const res = await fetch("/api/ai/agent-chat");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setConversations(json.data);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [status]);

  useEffect(() => {
    const t = setTimeout(fetchConversations, 0);
    return () => clearTimeout(t);
  }, [fetchConversations]);

  // One-shot handoff from the gallery: open a saved logo directly in the editor
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const raw = sessionStorage.getItem("logoforge:open-logo");
        if (!raw) return;
        sessionStorage.removeItem("logoforge:open-logo");
        const logo = JSON.parse(raw) as GeneratedLogo;
        if (logo?.imageUrl) {
          setCurrentLogo(logo);
          setActiveView("editor");
        }
      } catch (err) {
        console.error("Failed to open logo from gallery:", err);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Start a new conversation
  const handleNewChat = () => {
    const newSessionId = `session_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setCurrentLogo(null);
    setCurrentGuidelines(null);
    setActiveView("studio");
  };

  // Select an existing conversation
  const handleSelectConversation = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveView("studio");
  };

  // Delete a conversation
  const handleDeleteConversation = async (sessionId: string) => {
    try {
      await fetch(`/api/ai/agent-chat?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      setConversations((prev) => prev.filter((c) => c.sessionId !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Rename a conversation
  const handleRenameConversation = async (sessionId: string, newTitle: string) => {
    try {
      await fetch("/api/ai/agent-chat", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, title: newTitle }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.sessionId === sessionId ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
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

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* Studio Header Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-900 pb-3.5">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              title="Show Projects"
              className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 transition-colors cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-white" />
              <span>
                {activeView === "studio"
                  ? "Brand Identity Studio"
                  : activeView === "editor"
                    ? "Canvas Editor"
                    : "Brand Guidelines"}
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {activeView === "studio"
                ? "Conversational Brand Architecture & Real-Time Mark Synthesis"
                : activeView === "editor"
                  ? "Vector Typography, Geometry Reshaping & High-Resolution Export"
                  : "Identity System · Lockups, Palette, Typography & Usage Rules"}
            </p>
          </div>
        </div>

        {/* View Switcher Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-950 border border-neutral-900 self-start sm:self-auto">
          <button
            onClick={() => setActiveView("studio")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === "studio"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Studio Chat</span>
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

          <button
            onClick={() => setActiveView("guidelines")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeView === "guidelines"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Brand Kit</span>
            {currentGuidelines && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      {activeView === "studio" ? (
        <div className="w-full flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 items-start">
          {/* ChatGPT-style Left Sidebar */}
          <ChatSidebar
            conversations={conversations}
            activeSessionId={activeSessionId}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            isLoading={isLoadingConversations}
          />

          {/* Central Chat Interface */}
          <div className="flex-1 w-full min-w-0">
            <AgentChat
              key={activeSessionId}
              sessionId={activeSessionId}
              onLogoGenerated={(logo) => setCurrentLogo(logo)}
              onGuidelinesGenerated={(guidelines) => setCurrentGuidelines(guidelines)}
              onSessionUpdated={fetchConversations}
              onOpenEditor={() => setActiveView("editor")}
            />
          </div>

          {/* Right Live Preview Canvas */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-20">
            <LogoCanvas
              logo={currentLogo}
              isGenerating={false}
              onOpenEditor={() => setActiveView("editor")}
            />
          </div>
        </div>
      ) : activeView === "editor" ? (
        /* Full Canvas Editor View */
        <div className="w-full space-y-4">
          <LogoEditor
            logo={currentLogo}
            onClose={() => setActiveView("studio")}
          />
        </div>
      ) : (
        /* Brand Guidelines View */
        <div className="w-full flex-1">
          {currentGuidelines ? (
            <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-900 bg-[#0a0a0a] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-900 bg-[#0d0d0d]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {currentGuidelines.brandName} — Brand Guidelines
                  </p>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    Identity System · Fixed Template v1
                  </p>
                </div>
                <GuidelinesActions guidelines={currentGuidelines} logo={currentLogo} />
              </div>
              <BrandGuidelinesDocument guidelines={currentGuidelines} logo={currentLogo} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto rounded-2xl border border-neutral-900 bg-[#0a0a0a] py-24 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-5 h-5 text-neutral-400" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-200">No brand guidelines yet</h3>
              <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Generate a logo in the Studio Chat first — every generation produces 4 logo
                concepts plus a complete brand guidelines document.
              </p>
              <button
                onClick={() => setActiveView("studio")}
                className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Open Studio Chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
