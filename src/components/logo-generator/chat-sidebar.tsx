"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ChevronRight,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface ConversationSummary {
  sessionId: string;
  title: string;
  brandContext?: {
    brandName?: string;
    industry?: string;
    style?: string;
  };
  messages?: unknown[];
  updatedAt: string | Date;
}

interface ChatSidebarProps {
  conversations: ConversationSummary[];
  activeSessionId: string;
  isOpen: boolean;
  onToggle: () => void;
  onSelectConversation: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (sessionId: string) => void;
  onRenameConversation?: (sessionId: string, newTitle: string) => void;
  isLoading?: boolean;
}

export function ChatSidebar({
  conversations,
  activeSessionId,
  isOpen,
  onToggle,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isLoading,
}: ChatSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const startEditing = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
  };

  const handleSaveTitle = (sessionId: string) => {
    if (editTitle.trim() && onRenameConversation) {
      onRenameConversation(sessionId, editTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleCancelEditing = () => {
    setEditingSessionId(null);
    setEditTitle("");
  };

  if (!isOpen) {
    return (
      <div className="flex flex-col items-center">
        <button
          onClick={onToggle}
          title="Open Conversation History"
          className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer shadow-md"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full sm:w-72 flex flex-col h-[700px] rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden shrink-0 transition-all">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-neutral-900 flex items-center justify-between bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Logo Projects
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggle}
            title="Collapse Sidebar"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Project CTA Button */}
      <div className="p-3 border-b border-neutral-900/80">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all shadow-sm cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Logo Project</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-neutral-500">
            <div className="w-4 h-4 border-2 border-neutral-500 border-t-white rounded-full animate-spin mx-auto mb-2" />
            Loading projects...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500">
            <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-30" />
            <p>No logo projects yet.</p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Start a new project to generate custom logo marks.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.sessionId === activeSessionId;
            const displayTitle = conv.title || "Untitled Brand";
            const isEditing = editingSessionId === conv.sessionId;

            return (
              <div
                key={conv.sessionId}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  isActive
                    ? "bg-neutral-900 border-neutral-700 text-white font-medium shadow-sm"
                    : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                }`}
                onClick={() => !isEditing && onSelectConversation(conv.sessionId)}
              >
                {isEditing ? (
                  <div
                    className="flex items-center gap-1.5 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle(conv.sessionId);
                        if (e.key === "Escape") handleCancelEditing();
                      }}
                      autoFocus
                      className="flex-1 bg-black border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-white"
                    />
                    <button
                      onClick={() => handleSaveTitle(conv.sessionId)}
                      className="p-1 rounded bg-white text-black hover:bg-neutral-200"
                      title="Save"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleCancelEditing}
                      className="p-1 rounded text-neutral-400 hover:text-white"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? "text-white" : "text-neutral-500"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{displayTitle}</p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          {formatDate(conv.updatedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Rename & Delete */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(conv.sessionId, displayTitle);
                        }}
                        title="Rename Session"
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.sessionId);
                        }}
                        title="Delete Session"
                        className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
