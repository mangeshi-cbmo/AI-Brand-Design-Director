"use client";

import React from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Layers,
  ChevronRight,
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
  messages?: any[];
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
  isLoading,
}: ChatSidebarProps) {
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
            Brand Sessions
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

      {/* New Chat CTA Button */}
      <div className="p-3 border-b border-neutral-900/80">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-xs transition-all shadow-sm cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>New Brand Chat</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
        {isLoading ? (
          <div className="p-4 text-center text-xs text-neutral-500">
            <div className="w-4 h-4 border-2 border-neutral-500 border-t-white rounded-full animate-spin mx-auto mb-2" />
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-500">
            <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-30" />
            <p>No past sessions yet.</p>
            <p className="text-[11px] text-neutral-600 mt-1">
              Start a new chat to build your brand identity.
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.sessionId === activeSessionId;
            const displayTitle =
              conv.brandContext?.brandName || conv.title || "Untitled Brand";

            return (
              <div
                key={conv.sessionId}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  isActive
                    ? "bg-neutral-900 border-neutral-700 text-white font-medium shadow-sm"
                    : "bg-transparent border-transparent text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-200"
                }`}
                onClick={() => onSelectConversation(conv.sessionId)}
              >
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

                {/* Delete Conversation Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.sessionId);
                  }}
                  title="Delete Conversation"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-neutral-900 bg-black/40 text-[10px] text-neutral-500 text-center font-mono">
        Auto-synced with MongoDB Atlas
      </div>
    </aside>
  );
}
