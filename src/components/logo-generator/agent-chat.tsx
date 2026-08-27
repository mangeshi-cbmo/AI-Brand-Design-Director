"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Compass,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Download,
  Edit3,
  Sparkles,
} from "lucide-react";
import { ChatMessage, QuickOption } from "@/types/chat";
import { ColorPalette, GeneratedLogo, LogoStyle } from "@/types/logo";
import { BrandGuidelines } from "@/types/brand";
import { BrandGuidelinesModal } from "@/components/brand-kit/brand-guidelines";

/* Shape of messages returned by /api/ai/agent-chat */
interface ServerMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  quickOptions?: QuickOption[];
  logoData?: {
    logoId?: string;
    imageUrl: string;
    brandName?: string;
    style?: string;
    promptUsed?: string;
    variantLogoIds?: string[];
  };
  brandGuidelines?: BrandGuidelines;
}

interface AgentChatProps {
  sessionId: string;
  onLogoGenerated: (logo: GeneratedLogo) => void;
  onGuidelinesGenerated?: (guidelines: BrandGuidelines) => void;
  onSessionUpdated?: () => void;
  onOpenEditor?: () => void;
}

const THINKING_STEPS = [
  "Analyzing brand requirements",
  "Balancing typography & geometry",
  "Synthesizing 4 emblem concepts",
  "Compiling brand guidelines",
];

import { PALETTE_SWATCHES } from "@/config/palettes";

function PaletteDots({ palette, size = 3 }: { palette?: string; size?: number }) {
  const colors = palette ? PALETTE_SWATCHES[palette] : undefined;
  if (!colors) return null;
  return (
    <span className="inline-flex items-center -space-x-0.5">
      {colors.map((c, i) => (
        <span
          key={i}
          className="rounded-full ring-1 ring-black/60"
          style={{ backgroundColor: c, width: size * 4, height: size * 4 }}
        />
      ))}
    </span>
  );
}

/* Renders **bold** and "- " bullet lines without a markdown dependency */
function RichText({ content }: { content: string }) {
  const lines = (content || "").split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        const isBullet = /^[-*•]\s+/.test(trimmed);
        const text = isBullet ? trimmed.replace(/^[-*•]\s+/, "") : trimmed;
        const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

        const rendered = parts.map((part, j) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={j} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          ) : (
            <React.Fragment key={j}>{part.replace(/\*/g, "")}</React.Fragment>
          )
        );

        if (isBullet) {
          return (
            <div key={i} className="flex items-start gap-2.5 pl-1">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-neutral-500 shrink-0" />
              <span>{rendered}</span>
            </div>
          );
        }
        return <p key={i}>{rendered}</p>;
      })}
    </div>
  );
}

/* Geometric monogram avatar for the Architect agent */
function ArchitectAvatar({ pulsing = false }: { pulsing?: boolean }) {
  return (
    <div className="relative w-7 h-7 shrink-0">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neutral-800 to-black border border-neutral-700 flex items-center justify-center shadow-md">
        <Compass className="w-3.5 h-3.5 text-neutral-200" />
      </div>
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
          pulsing ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
        }`}
      />
    </div>
  );
}

const formatTime = (d: Date) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function AgentChat({
  sessionId,
  onLogoGenerated,
  onGuidelinesGenerated,
  onSessionUpdated,
  onOpenEditor,
}: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-msg",
      role: "assistant",
      content: "Hi! Let's craft your logo mark.\n\nWhat is the name of your brand or company?",
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  /* Which concept is selected per generation message (msgId -> logoId) */
  const [selectedConcepts, setSelectedConcepts] = useState<Record<string, string>>({});
  const [guidelinesView, setGuidelinesView] = useState<{
    guidelines: BrandGuidelines;
    logo: GeneratedLogo | null;
  } | null>(null);

  const [context, setContext] = useState<{
    brandName?: string;
    industry?: string;
    style?: string;
    colorPalette?: string;
    concept?: string;
    slogan?: string;
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idSeqRef = useRef(0);
  const onLogoGeneratedRef = useRef(onLogoGenerated);
  const onGuidelinesGeneratedRef = useRef(onGuidelinesGenerated);
  useEffect(() => {
    onLogoGeneratedRef.current = onLogoGenerated;
    onGuidelinesGeneratedRef.current = onGuidelinesGenerated;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [sessionId]);

  // Cycle thinking step words when thinking
  useEffect(() => {
    if (!isThinking) return;
    const interval = setInterval(() => {
      setThinkingStepIdx((prev) => Math.min(prev + 1, THINKING_STEPS.length - 1));
    }, 2200);
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
          const serverMessages = data.data.messages as ServerMessage[];

          // Hydrate concept variations from the logos collection (only ids
          // are stored in the conversation to keep its document small)
          const variantIds = new Set<string>();
          serverMessages.forEach((m) =>
            m.logoData?.variantLogoIds?.forEach((id) => variantIds.add(id))
          );
          const logoById = new Map<string, GeneratedLogo>();
          if (variantIds.size > 0) {
            try {
              const logosRes = await fetch("/api/logos");
              const logosJson = await logosRes.json();
              if (logosJson.success && Array.isArray(logosJson.data)) {
                (logosJson.data as GeneratedLogo[]).forEach((l) => {
                  if (variantIds.has(l.id)) logoById.set(l.id, l);
                });
              }
            } catch (err) {
              console.error("Failed to hydrate logo variants:", err);
            }
          }

          const loadedMessages: ChatMessage[] = serverMessages.map((m) => {
            const variants = m.logoData?.variantLogoIds
              ?.map((id) => logoById.get(id))
              .filter((l): l is GeneratedLogo => Boolean(l));
            return {
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt),
              quickOptions: m.quickOptions,
              brandGuidelines: m.brandGuidelines,
              generatedLogos: variants && variants.length > 1 ? variants : undefined,
              generatedLogo: m.logoData
                ? {
                    id: m.logoData.logoId || `logo-${m.id}`,
                    imageUrl: m.logoData.imageUrl,
                    brandName: m.logoData.brandName || "Brand Logo",
                    style: (m.logoData.style as LogoStyle) || "minimalist",
                    colorPalette:
                      (data.data.brandContext?.colorPalette as ColorPalette) || "monochrome",
                    promptUsed: m.logoData.promptUsed || "",
                    createdAt: new Date(m.createdAt),
                  }
                : undefined,
            };
          });

          setMessages(loadedMessages);
          setContext(data.data.brandContext || {});

          const lastLogo = loadedMessages.slice().reverse().find((m) => m.generatedLogo);
          if (lastLogo?.generatedLogo) {
            onLogoGeneratedRef.current(lastLogo.generatedLogo);
          }

          const lastGuidelines = loadedMessages
            .slice()
            .reverse()
            .find((m) => m.brandGuidelines);
          if (lastGuidelines?.brandGuidelines) {
            onGuidelinesGeneratedRef.current?.(lastGuidelines.brandGuidelines);
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
    idSeqRef.current += 1;
    const userMsg: ChatMessage = {
      id: `user_${idSeqRef.current}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinkingStepIdx(0);
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

      const {
        message,
        quickOptions,
        generatedLogo,
        generatedLogos,
        brandGuidelines,
        context: newContext,
      } = json.data || {};

      setContext(newContext || {});

      if (generatedLogo) {
        onLogoGenerated(generatedLogo);
      }
      if (brandGuidelines) {
        onGuidelinesGenerated?.(brandGuidelines);
      }

      idSeqRef.current += 1;
      const assistantMsg: ChatMessage = {
        id: `assistant_${idSeqRef.current}`,
        role: "assistant",
        content: message || "I generated a response, but it came back empty — please try again.",
        timestamp: new Date(),
        quickOptions,
        generatedLogo,
        generatedLogos,
        brandGuidelines,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (onSessionUpdated) {
        onSessionUpdated();
      }
    } catch (err) {
      console.error(err);
      idSeqRef.current += 1;
      const errorMsg: ChatMessage = {
        id: `error_${idSeqRef.current}`,
        role: "assistant",
        content: "I encountered a processing error. Please retry or adjust your requirements.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCopyMessage = (msg: ChatMessage) => {
    navigator.clipboard.writeText((msg.content || "").replace(/\*\*/g, ""));
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleDownloadLogo = (logo: GeneratedLogo) => {
    const a = document.createElement("a");
    a.href = logo.imageUrl;
    a.download = `${(logo.brandName || "brand").toLowerCase().replace(/\s+/g, "-")}-logo.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* All concepts attached to a message, and the currently selected one */
  const conceptsOf = (msg: ChatMessage): GeneratedLogo[] =>
    msg.generatedLogos?.length
      ? msg.generatedLogos
      : msg.generatedLogo
        ? [msg.generatedLogo]
        : [];

  const selectedConceptOf = (msg: ChatMessage): GeneratedLogo | undefined => {
    const concepts = conceptsOf(msg);
    return concepts.find((l) => l.id === selectedConcepts[msg.id]) || concepts[0];
  };

  const handleSelectConcept = (msg: ChatMessage, concept: GeneratedLogo) => {
    setSelectedConcepts((prev) => ({ ...prev, [msg.id]: concept.id }));
    onLogoGenerated(concept);
  };

  /* Spec pipeline: which brand parameters have been collected */
  const specSteps = [
    { label: "Brand", value: context.brandName },
    { label: "Industry", value: context.industry },
    { label: "Style", value: context.style },
    { label: "Palette", value: context.colorPalette },
  ];
  const specDone = specSteps.filter((s) => s.value).length;

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <>
      {guidelinesView && (
        <BrandGuidelinesModal
          guidelines={guidelinesView.guidelines}
          logo={guidelinesView.logo}
          onClose={() => setGuidelinesView(null)}
        />
      )}
      <div className="flex flex-col h-[700px] w-full rounded-2xl border border-neutral-900 bg-[#0a0a0a] shadow-2xl overflow-hidden font-sans">
      {/* Agent Activity Header */}
      <div className="border-b border-neutral-900 bg-[#0d0d0d]">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <ArchitectAvatar pulsing={isThinking} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-100 tracking-wide font-mono">
                  agent:brand-architect
                </span>
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
                    isThinking
                      ? "text-amber-300 border-amber-400/20 bg-amber-400/5"
                      : "text-emerald-300 border-emerald-400/20 bg-emerald-400/5"
                  }`}
                >
                  {isThinking ? "working" : "online"}
                </span>
              </div>
              {context.brandName ? (
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5 flex items-center gap-1.5">
                  {context.brandName.toLowerCase().replace(/\s+/g, "-")}
                  {context.colorPalette && <PaletteDots palette={context.colorPalette} size={2} />}
                </p>
              ) : (
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  conversational identity design
                </p>
              )}
            </div>
          </div>

          {/* Spec collection progress */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              {specSteps.map((s) => (
                <span
                  key={s.label}
                  title={`${s.label}${s.value ? `: ${s.value}` : " — pending"}`}
                  className={`h-1 w-6 rounded-full transition-colors ${
                    s.value ? "bg-white" : "bg-neutral-800"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-neutral-500">{specDone}/4 spec</span>
          </div>
        </div>
        {/* Gradient hairline */}
        <div className="h-px bg-gradient-to-r from-transparent via-neutral-700/60 to-transparent" />
      </div>

      {/* Messages Viewport */}
      <div className="chat-scroll flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-4"
            >
              {msg.role === "user" ? (
                /* USER MESSAGE */
                <div className="flex flex-col items-end gap-1">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-gradient-to-b from-[#242424] to-[#1b1b1b] border border-neutral-800 text-neutral-100 text-sm shadow-md">
                    {msg.content}
                  </div>
                  <span className="text-[9px] font-mono text-neutral-700 pr-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              ) : (
                /* ASSISTANT MESSAGE */
                <div className="flex gap-3">
                  <ArchitectAvatar />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-neutral-300">Architect</span>
                      <span className="text-[9px] font-mono text-neutral-700">
                        {formatTime(msg.timestamp)}
                      </span>
                      <button
                        onClick={() => handleCopyMessage(msg)}
                        title="Copy message"
                        className="opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 p-0.5 text-neutral-600 hover:text-neutral-300 transition-all cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Brand spec card — shown on the latest agent reply once params exist */}
                    {msg.id === lastAssistantId && context.brandName && (
                      <div className="rounded-xl border border-neutral-800/80 bg-[#101010] overflow-hidden text-xs font-mono">
                        <div className="flex items-center justify-between px-3.5 py-2 border-b border-neutral-800/80 bg-[#151515]">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-neutral-700" />
                              <span className="w-2 h-2 rounded-full bg-neutral-700" />
                              <span className="w-2 h-2 rounded-full bg-neutral-700" />
                            </span>
                            <span className="text-neutral-300 font-medium ml-1">
                              brand.spec
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            {specDone}/4 resolved
                          </span>
                        </div>

                        <div className="p-3.5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[11px]">
                          {specSteps.map((s, i) => (
                            <div key={s.label} className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                  s.value
                                    ? "border-neutral-600 bg-neutral-800"
                                    : "border-neutral-800 bg-transparent"
                                }`}
                              >
                                {s.value ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                ) : (
                                  <span className="text-[8px] text-neutral-600">{i + 1}</span>
                                )}
                              </span>
                              <span className="text-neutral-500 shrink-0">{s.label.toLowerCase()}:</span>
                              {s.label === "Palette" && s.value ? (
                                <span className="flex items-center gap-1.5 truncate text-neutral-200">
                                  <PaletteDots palette={s.value} size={2} />
                                  <span className="truncate">{s.value}</span>
                                </span>
                              ) : (
                                <span
                                  className={`truncate ${
                                    s.value ? "text-white font-medium" : "text-neutral-700 italic"
                                  }`}
                                >
                                  {s.value || "pending"}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Response body */}
                    <div className="text-neutral-200 text-sm leading-relaxed">
                      <RichText content={msg.content} />
                    </div>

                    {/* Generated concepts */}
                    {msg.generatedLogo &&
                      (() => {
                        const concepts = conceptsOf(msg);
                        const selected = selectedConceptOf(msg)!;
                        return (
                          <div className="space-y-2.5">
                            {/* Concept selection grid */}
                            {concepts.length > 1 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {concepts.map((concept, ci) => {
                                  const isSelected = concept.id === selected.id;
                                  return (
                                    <button
                                      key={concept.id}
                                      onClick={() => handleSelectConcept(msg, concept)}
                                      title={`Select concept ${ci + 1}`}
                                      className={`group relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer bg-neutral-950 bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:10px_10px] ${
                                        isSelected
                                          ? "border-white ring-1 ring-white/60"
                                          : "border-neutral-800 hover:border-neutral-600"
                                      }`}
                                    >
                                      <Image
                                        src={concept.imageUrl}
                                        alt={`${concept.brandName} concept ${ci + 1}`}
                                        fill
                                        unoptimized
                                        className="object-contain p-2.5"
                                      />
                                      <span
                                        className={`absolute top-1.5 left-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-md ${
                                          isSelected
                                            ? "bg-white text-black font-semibold"
                                            : "bg-black/70 text-neutral-400"
                                        }`}
                                      >
                                        0{ci + 1}
                                      </span>
                                      {isSelected && (
                                        <span className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center">
                                          <Check className="w-2.5 h-2.5 text-black" />
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Selected concept summary card */}
                            <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-[#131313] to-[#0d0d0d] p-3.5">
                              <div className="flex items-center gap-4">
                                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-950 bg-[radial-gradient(#262626_1px,transparent_1px)] bg-[size:10px_10px]">
                                  <Image
                                    src={selected.imageUrl}
                                    alt={selected.brandName}
                                    fill
                                    unoptimized
                                    className="object-contain p-1.5"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-white shrink-0" />
                                    <p className="font-semibold text-sm text-white truncate">
                                      {selected.brandName}
                                    </p>
                                  </div>
                                  <p className="text-[11px] text-neutral-400 capitalize mt-0.5 font-mono">
                                    {(selected.style || "custom").replace(/-/g, " ")} emblem
                                    {concepts.length > 1
                                      ? ` · concept ${concepts.findIndex((c) => c.id === selected.id) + 1}/${concepts.length}`
                                      : " synthesized"}
                                  </p>
                                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                    {onOpenEditor && (
                                      <button
                                        onClick={() => {
                                          onLogoGenerated(selected);
                                          onOpenEditor();
                                        }}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-black text-[11px] font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                        Open in Editor
                                      </button>
                                    )}
                                    {msg.brandGuidelines && (
                                      <button
                                        onClick={() =>
                                          setGuidelinesView({
                                            guidelines: msg.brandGuidelines!,
                                            logo: selected,
                                          })
                                        }
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-200 text-[11px] font-medium hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
                                      >
                                        <BookOpen className="w-3 h-3" />
                                        Brand Guidelines
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownloadLogo(selected)}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-300 text-[11px] hover:bg-neutral-900 hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3 h-3" />
                                      PNG
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                    {/* Quick option chips */}
                    {msg.quickOptions && msg.quickOptions.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {msg.quickOptions.map((opt: QuickOption, idx: number) => (
                          <motion.button
                            key={idx}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 * idx, duration: 0.2 }}
                            onClick={() => sendMessage(opt.value)}
                            disabled={isThinking}
                            title={opt.description}
                            className="group text-xs px-3 py-1.5 rounded-xl border border-neutral-800 bg-[#141414] hover:bg-white hover:text-black hover:border-white text-neutral-300 transition-all duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                          >
                            <span>{opt.label}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-500 group-hover:text-black group-hover:translate-x-0.5 transition-all" />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live thinking state */}
        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <ArchitectAvatar pulsing />
            <div className="flex-1 space-y-2.5">
              <div className="inline-flex items-center gap-3 bg-[#111111] border border-neutral-800 rounded-xl px-4 py-2.5">
                <span className="flex items-center gap-1">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-neutral-300" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-neutral-300" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-neutral-300" />
                </span>
                <span className="text-shimmer text-xs font-mono font-medium">
                  {THINKING_STEPS[thinkingStepIdx]}...
                </span>
              </div>

              <div className="pl-1 space-y-1.5 text-[11px] font-mono">
                {THINKING_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-2 transition-colors ${
                      i < thinkingStepIdx
                        ? "text-neutral-400"
                        : i === thinkingStepIdx
                          ? "text-neutral-200"
                          : "text-neutral-700"
                    }`}
                  >
                    {i < thinkingStepIdx ? (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : i === thinkingStepIdx ? (
                      <span className="w-3 h-3 flex items-center justify-center shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-neutral-600 border-t-white animate-spin" />
                      </span>
                    ) : (
                      <span className="w-3 h-3 flex items-center justify-center shrink-0">
                        <span className="w-1 h-1 rounded-full bg-neutral-700" />
                      </span>
                    )}
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Composer */}
      <div className="p-3.5 bg-[#0a0a0a] border-t border-neutral-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="rounded-2xl border border-neutral-800 bg-[#111111] p-3 transition-all duration-200 focus-within:border-neutral-600 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.04)]"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your brand direction..."
            disabled={isThinking}
            className="w-full bg-transparent text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none"
          />

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-neutral-800/60">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1a1a1a] border border-neutral-800 text-[11px] font-mono text-neutral-300">
                <Compass className="w-3 h-3 text-neutral-400" />
                <span>Brand Architect</span>
              </div>
              <span className="hidden sm:inline text-[10px] font-mono text-neutral-700">
                Enter ↵ to send
              </span>
            </div>

            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                input.trim() && !isThinking
                  ? "bg-white text-black hover:bg-neutral-200 hover:scale-105 shadow-md"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>
      </div>
    </>
  );
}
