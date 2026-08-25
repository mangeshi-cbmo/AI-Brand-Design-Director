"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Compass,
  ArrowRight,
  Check,
  CheckCircle2,
  Terminal,
  Layers,
  Sparkles,
  Activity,
  Cpu,
  Sliders,
} from "lucide-react";
import { ChatMessage, QuickOption } from "@/types/chat";
import { GeneratedLogo } from "@/types/logo";

interface AgentChatProps {
  sessionId: string;
  onLogoGenerated: (logo: GeneratedLogo) => void;
  onSessionUpdated?: () => void;
}

const THINKING_STEPS = [
  "Analyzing brand requirements...",
  "Working on typography & visual balance...",
  "Creating geometric mark tokens...",
  "Synthesizing high-res vector emblem...",
];

export function AgentChat({
  sessionId,
  onLogoGenerated,
  onSessionUpdated,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content: "Hi! Let's craft your logo mark.\n\n**What is the name of your brand or company?**",
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
  const [thinkingStepIdx, setThinkingStepIdx] = useState(0);

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

  // Cycle thinking step words when thinking
  useEffect(() => {
    if (!isThinking) {
      setThinkingStepIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setThinkingStepIdx((prev) => (prev + 1) % THINKING_STEPS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isThinking]);

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
    <div className="flex flex-col h-[700px] w-full rounded-2xl border border-neutral-900 bg-[#0a0a0a] shadow-2xl overflow-hidden font-sans">
      {/* Sleek Agent Activity Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-900 bg-[#0d0d0d]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-200 tracking-wide font-mono">
              agent:brand-architect
            </span>
          </div>
          {context.brandName && (
            <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
              &bull; session: {context.brandName.toLowerCase().replace(/\s+/g, "-")}
            </span>
          )}
        </div>

        {context.brandName && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300">
            <span className="text-neutral-500">style:</span>
            <span className="capitalize">{context.style || "Minimal"}</span>
          </div>
        )}
      </div>

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* USER MESSAGE: Modern Dark Capsule */}
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-[#1f1f1f] border border-neutral-800 text-neutral-100 text-sm font-normal shadow-sm">
                    {msg.content}
                  </div>
                </div>
              ) : (
                /* ASSISTANT MESSAGE: Dynamic Agent Action Card */
                <div className="space-y-3">
                  {/* Dynamic Action & State Card (No brand.spec.json text) */}
                  {index > 0 && context.brandName && (
                    <div className="rounded-xl border border-neutral-800/80 bg-[#111111] overflow-hidden text-xs font-mono shadow-inner">
                      {/* Card Dynamic Action Bar */}
                      <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-[#141414] text-[11px] text-neutral-400">
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <Activity className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="text-neutral-200 font-medium">
                            {msg.generatedLogo
                              ? "Creating & Synthesizing Emblem"
                              : "Analyzing & Formulating Parameters"}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Synchronized
                        </span>
                      </div>

                      {/* Code Block with Line Numbers & Interactive Values */}
                      <div className="p-3 bg-[#0d0d0d] font-mono text-[11px] leading-relaxed text-neutral-300">
                        <div className="flex gap-3">
                          <span className="text-neutral-600 select-none">01</span>
                          <span>
                            <span className="text-neutral-400">brand:</span>{" "}
                            <span className="text-white font-semibold">&quot;{context.brandName}&quot;</span>
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-neutral-600 select-none">02</span>
                          <span>
                            <span className="text-neutral-400">industry:</span>{" "}
                            <span className="text-neutral-200">&quot;{context.industry || "Technology"}&quot;</span>
                          </span>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-neutral-600 select-none">03</span>
                          <span>
                            <span className="text-neutral-400">style:</span>{" "}
                            <span className="text-emerald-400 font-medium">&quot;{context.style || "minimalist"}&quot;</span>
                          </span>
                        </div>
                        {context.colorPalette && (
                          <div className="flex gap-3">
                            <span className="text-neutral-600 select-none">04</span>
                            <span>
                              <span className="text-neutral-400">palette:</span>{" "}
                              <span className="text-neutral-300">&quot;{context.colorPalette}&quot;</span>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="px-3.5 py-1.5 border-t border-neutral-900 bg-[#0d0d0d] text-[10px] text-neutral-500 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Working on visual mark synthesis</span>
                        </div>
                        <span className="text-neutral-600 font-mono">active state</span>
                      </div>
                    </div>
                  )}

                  {/* Main Response Typography */}
                  <div className="text-neutral-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Inline Generated Logo Card if available */}
                  {msg.generatedLogo && (
                    <div className="mt-3 rounded-xl border border-neutral-800 bg-[#121212] p-3 flex items-center gap-3.5">
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
                          <p className="font-semibold text-xs text-white truncate">
                            {msg.generatedLogo.brandName}
                          </p>
                        </div>
                        <p className="text-[11px] text-neutral-400 capitalize mt-0.5 font-mono">
                          {msg.generatedLogo.style.replace("-", " ")} emblem synthesized
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Suggestion Chips */}
                  {msg.quickOptions && msg.quickOptions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.quickOptions.map((opt, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(opt.value)}
                          disabled={isThinking}
                          className="text-xs px-3 py-1.5 rounded-xl border border-neutral-800 bg-[#141414] hover:bg-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span>{opt.label}</span>
                          <ArrowRight className="w-3 h-3 text-neutral-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live Dynamic Action / Working State */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2 text-xs font-mono"
          >
            <div className="flex items-center gap-2.5 text-neutral-200 bg-[#121212] border border-neutral-800 rounded-xl px-3.5 py-2.5">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-600 border-t-white animate-spin" />
              <span className="font-medium">{THINKING_STEPS[thinkingStepIdx]}</span>
            </div>

            <div className="pl-3 space-y-1 text-[11px] text-neutral-500">
              <div className="flex items-center gap-2">
                <Check className="w-3 h-3 text-emerald-400" />
                <span>Analyzing brand context & market sector</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5 mr-1" />
                <span>Working on vector prompt composition & geometry</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Modern Developer-Style Prompt Container */}
      <div className="p-3.5 bg-[#0a0a0a] border-t border-neutral-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="rounded-2xl border border-neutral-800 bg-[#121212] p-3 transition-colors focus-within:border-neutral-700"
        >
          {/* Main Input Textarea/Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send follow-up or describe your brand direction..."
            disabled={isThinking}
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-neutral-800 text-[11px] font-mono text-neutral-300">
                <Compass className="w-3 h-3 text-neutral-400" />
                <span>Brand Architect</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                input.trim() && !isThinking
                  ? "bg-white text-black hover:bg-neutral-200 shadow-md"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
