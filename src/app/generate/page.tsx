"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageSquare, Edit3, Compass, PanelLeft } from "lucide-react";
import { AgentChat } from "@/components/logo-generator/agent-chat";
import { LogoCanvas } from "@/components/logo-generator/logo-canvas";
import { LogoEditor } from "@/components/canvas-editor/logo-editor";
import { ChatSidebar, ConversationSummary } from "@/components/logo-generator/chat-sidebar";
import { GeneratedLogo } from "@/types/logo";

export default function GenerateStudioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [currentLogo, setCurrentLogo] = useState<GeneratedLogo | null>(null);
  const [activeView, setActiveView] = useState<"studio" | "editor">("studio");

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
    fetchConversations();
  }, [fetchConversations]);

  // Start a new conversation
  const handleNewChat = () => {
    const newSessionId = `session_${Date.now()}`;
    setActiveSessionId(newSessionId);
    setCurrentLogo(null);
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
              title="Show Sessions"
              className="p-2 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-300 transition-colors cursor-pointer"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-white" />
              <span>{activeView === "studio" ? "Brand Identity Studio" : "Canvas Editor"}</span>
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {activeView === "studio"
                ? "Conversational Brand Architecture & Real-Time Mark Synthesis"
                : "Vector Typography, Geometry Reshaping & High-Resolution Export"}
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
              onSessionUpdated={fetchConversations}
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
      ) : (
        /* Full Canvas Editor View */
        <div className="w-full space-y-4">
          <LogoEditor
            logo={currentLogo}
            onClose={() => setActiveView("studio")}
          />
        </div>
      )}
    </div>
  );
}
