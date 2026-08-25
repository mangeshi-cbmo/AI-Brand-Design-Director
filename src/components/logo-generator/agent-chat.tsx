"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RefreshCw, Bot, User, ArrowRight } from "lucide-react";
import { ChatMessage, QuickOption } from "@/types/chat";
import { GeneratedLogo } from "@/types/logo";

interface AgentChatProps {
  onLogoGenerated: (logo: GeneratedLogo) => void;
}

export function AgentChat({ onLogoGenerated }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content: "Hello! I am your **AI Brand Architect**. I'll help you craft a unique, professional logo mark step-by-step.\n\nTo get started, **what is the name of your brand or company?**",
      timestamp: new Date(),
      quickOptions: [
        { label: "Acme AI", value: "Acme AI" },
        { label: "Apex Labs", value: "Apex Labs" },
        { label: "Lumina Studio", value: "Lumina Studio" },
        { label: "Verve", value: "Verve" },
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

  const sendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isThinking) return;

    // Check if user clicked start over
    if (messageText === "START_OVER") {
      handleRestart();
      return;
    }

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
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: "I encountered an issue generating your request. Let's try again or refine your prompt.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleRestart = () => {
    setContext({});
    setMessages([
      {
        id: `reset_${Date.now()}`,
        role: "assistant",
        content: "Let's start fresh! **What is the name of your new brand or project?**",
        timestamp: new Date(),
        quickOptions: [
          { label: "Nova Labs", value: "Nova Labs" },
          { label: "Pulse", value: "Pulse" },
          { label: "Zenith Studio", value: "Zenith Studio" },
        ],
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[650px] w-full rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden">
      {/* Agent Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-900 bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">AI Brand Architect</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              {context.brandName ? `Designing for: ${context.brandName}` : "Interactive Logo Generation"}
            </p>
          </div>
        </div>

        <button
          onClick={handleRestart}
          title="Start fresh conversation"
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-neutral-800 hover:border-neutral-700 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Brand</span>
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 font-sans text-sm">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 space-y-3 ${
                  msg.role === "user"
                    ? "bg-white text-black font-medium ml-auto rounded-tr-sm"
                    : "bg-black border border-neutral-800 text-neutral-200 rounded-tl-sm"
                }`}
              >
                <div className="whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                  {msg.content}
                </div>

                {/* Inline Logo Preview Card in chat if generated */}
                {msg.generatedLogo && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3 mt-2">
                    <div className="relative w-16 h-16 rounded-lg bg-black border border-neutral-800 flex items-center justify-center shrink-0 overflow-hidden">
                      <Image
                        src={msg.generatedLogo.imageUrl}
                        alt={msg.generatedLogo.brandName}
                        width={64}
                        height={64}
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{msg.generatedLogo.brandName}</h4>
                      <p className="text-[10px] text-neutral-400 capitalize mt-0.5">
                        Style: {msg.generatedLogo.style.replace("-", " ")}
                      </p>
                      <span className="text-[10px] text-emerald-400 inline-block font-mono mt-1">
                        &bull; Ready in Live Preview
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Selection Options / Chips */}
                {msg.quickOptions && msg.quickOptions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {msg.quickOptions.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(opt.value)}
                        disabled={isThinking}
                        className="text-xs px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-900/90 hover:bg-white hover:text-black text-neutral-200 transition-all font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          ))}

          {/* Thinking / Synthesizing Indicator */}
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3.5 rounded-2xl rounded-tl-sm bg-black border border-neutral-800 text-neutral-400 text-xs flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" />
                </div>
                <span>Architect is designing concept...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Input Box */}
      <div className="p-3.5 border-t border-neutral-900 bg-black">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isThinking}
            placeholder={
              !context.brandName
                ? "Type your brand name (e.g. Acme Labs)..."
                : !context.industry
                ? "Type your industry..."
                : "Type your instruction or refinement..."
            }
            className="flex-1 rounded-xl bg-neutral-950 border border-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isThinking}
            className="p-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
