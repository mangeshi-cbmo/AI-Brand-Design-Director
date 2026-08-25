"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Compass,
  User,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
} from "lucide-react";
import { ChatMessage, QuickOption } from "@/types/chat";
import { GeneratedLogo } from "@/types/logo";

interface AgentChatProps {
  sessionId: string;
  onLogoGenerated: (logo: GeneratedLogo) => void;
  onSessionUpdated?: () => void;
}

export function AgentChat({
  sessionId,
  onLogoGenerated,
  onSessionUpdated,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content:
        "Welcome to the **Brand Identity Studio**. I am your **Brand Architect**.\n\nI will guide you to formulate your brand strategy and engineer commercial-grade logo marks.\n\nTo begin, **what is the name of your brand or company?**",
      timestamp: new Date(),
      quickOptions: [
        { label: "Acme AI", value: "Acme AI" },
        { label: "Apex Labs", value: "Apex Labs" },
        { label: "Lumina Studio", value: "Lumina Studio" },
        { label: "Verve Dynamics", value: "Verve Dynamics" },
      ],
    },
  ]);

  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [context, setContext] = useState<{
    brandName?: string;
    industry?: string;
    style?: string;
    colorPalette?: string;
    concept?: string;
    slogan?: string;
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Load conversation history when sessionId changes
  useEffect(() => {
    async function loadConversation() {
      if (!sessionId) return;
      try {
        const res = await fetch(`/api/ai/agent-chat?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.messages?.length > 0) {
          const loadedMessages: ChatMessage[] = data.data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
            quickOptions: m.quickOptions,
            generatedLogo: m.logoData
              ? {
                  id: m.logoData.logoId || `logo-${Date.now()}`,
                  imageUrl: m.logoData.imageUrl,
                  brandName: m.logoData.brandName || "Brand Logo",
                  industry: data.data.brandContext?.industry || "General",
                  style: (m.logoData.style as any) || "minimalist",
                  colorPalette: (data.data.brandContext?.colorPalette as any) || "monochrome",
                  promptUsed: m.logoData.promptUsed || "",
                  createdAt: new Date(m.createdAt).toISOString(),
                }
              : undefined,
          }));

          setMessages(loadedMessages);
          setContext(data.data.brandContext || {});

          // If there's an existing logo in this session, activate it
          const lastLogo = loadedMessages.slice().reverse().find((m) => m.generatedLogo);
          if (lastLogo?.generatedLogo) {
            onLogoGenerated(lastLogo.generatedLogo);
          }
        }
      } catch (err) {
        console.error("Failed to load session:", err);
      }
    }

    loadConversation();
  }, [sessionId]);

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isThinking) return;

    // 1. Append user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/ai/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          context,
          sessionId,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || "Failed to get agent response");
      }

      const { message, quickOptions, generatedLogo, context: newContext } = json.data;

      setContext(newContext || {});

      // If a logo was created by the agent, pass it to the preview canvas
      if (generatedLogo) {
        onLogoGenerated(generatedLogo);
      }

      const assistantMsg: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: message,
        timestamp: new Date(),
        quickOptions,
        generatedLogo,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Notify parent to refresh conversation list in sidebar
      if (onSessionUpdated) {
        onSessionUpdated();
      }
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "I encountered a processing error. Please retry or adjust your requirements.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] w-full rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden">
      {/* Studio Agent Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-900 bg-black/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {/* Agent Distinct Monogram Badge */}
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-mono font-black text-xs shadow-md">
            <Compass className="w-4 h-4 text-black stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">
                Brand Architect
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-300">
                GPT-4o
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              {context.brandName ? `Active Brand: ${context.brandName}` : "Conversational Design Engine"}
            </p>
          </div>
        </div>

        {context.brandName && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono text-neutral-300">
            <Layers className="w-3 h-3 text-neutral-400" />
            <span className="capitalize">{context.style || "Minimal"}</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 items-start ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {/* Agent Avatar */}
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-black border border-neutral-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                  <Compass className="w-4 h-4 text-neutral-200 stroke-[2]" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white text-black font-medium shadow-md"
                    : "bg-black border border-neutral-900 text-neutral-200 shadow-sm"
                }`}
              >
                {/* Message Body */}
                <div className="whitespace-pre-wrap space-y-2">{msg.content}</div>

                {/* Inline Generated Logo Card */}
                {msg.generatedLogo && (
                  <div className="mt-3.5 pt-3.5 border-t border-neutral-800">
                    <div className="flex items-center gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-700 bg-black shrink-0">
                        <Image
                          src={msg.generatedLogo.imageUrl}
                          alt={msg.generatedLogo.brandName}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <p className="font-bold text-xs text-white truncate">
                            {msg.generatedLogo.brandName}
                          </p>
                        </div>
                        <p className="text-[11px] text-neutral-400 capitalize mt-0.5">
                          {msg.generatedLogo.style.replace("-", " ")} Mark
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Action Chips */}
                {msg.quickOptions && msg.quickOptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
                    {msg.quickOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(opt.value)}
                        disabled={isThinking}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="w-3 h-3 text-neutral-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* User Avatar */}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                  YOU
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Architect Reasoning Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-center text-neutral-400 text-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-black border border-neutral-800 flex items-center justify-center text-white shrink-0">
              <Compass className="w-4 h-4 text-neutral-400 animate-spin" />
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black border border-neutral-900">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Architect is analyzing requirements & synthesizing concepts...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="p-3 bg-black border-t border-neutral-900 flex gap-2 items-center"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your brand, industry, or visual direction..."
          disabled={isThinking}
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs sm:text-sm hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
