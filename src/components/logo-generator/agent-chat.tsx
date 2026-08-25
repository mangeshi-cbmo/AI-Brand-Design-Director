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
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}`);
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
    setSessionId(`session_${Date.now()}`);
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
          <span>New Chat</span>
        </button>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-neutral-800">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-white text-black font-medium"
                    : "bg-black border border-neutral-900 text-neutral-200"
                }`}
              >
                {/* Markdown text rendering */}
                <div className="whitespace-pre-wrap space-y-2">{msg.content}</div>

                {/* Inline Generated Logo Card if returned */}
                {msg.generatedLogo && (
                  <div className="mt-3 pt-3 border-t border-neutral-800">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950 shrink-0">
                        <Image
                          src={msg.generatedLogo.imageUrl}
                          alt={msg.generatedLogo.brandName}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs text-white truncate">
                          {msg.generatedLogo.brandName}
                        </p>
                        <p className="text-[11px] text-neutral-400 capitalize">
                          {msg.generatedLogo.style.replace("-", " ")} Style
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clickable Quick Options Chips */}
                {msg.quickOptions && msg.quickOptions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap gap-1.5">
                    {msg.quickOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => sendMessage(opt.value)}
                        disabled={isThinking}
                        className="text-xs px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 text-neutral-300 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <span>{opt.label}</span>
                        <ArrowRight className="w-2.5 h-2.5 text-neutral-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-black shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking Indicator */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 items-center text-neutral-400 text-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black border border-neutral-900">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Architect is crafting your concept...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
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
          placeholder="Reply to the Architect or describe your vision..."
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
