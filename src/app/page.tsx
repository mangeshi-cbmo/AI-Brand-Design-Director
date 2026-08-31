"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Check,
  Copy,
  Sparkles,
  MessageSquare,
  PenTool,
  Download,
  Mail,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* Seconds until the current TOTP window rolls over (codes rotate every 30s) */
function totpSecondsRemaining() {
  return 30 - (Math.floor(Date.now() / 1000) % 30);
}

const HEADLINE_WORDS = ["Craft", "a", "logo", "that"];
const HEADLINE_ACCENT = ["speaks", "your", "brand."];

const FEATURES = [
  { icon: MessageSquare, title: "Agent Chat", desc: "Conversational design" },
  { icon: PenTool, title: "Canvas Editor", desc: "Pro vector tooling" },
  { icon: Download, title: "Export Kit", desc: "PNG · SVG · High-res" },
];

const FLOATING_CHIPS = [
  { icon: Sparkles, label: "ai synthesis", className: "top-6 -left-40", delay: 0 },
  { icon: PenTool, label: "vector canvas", className: "top-40 -right-44", delay: 1.2 },
  { icon: Layers, label: "layered export", className: "bottom-10 -left-48", delay: 2.1 },
];

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Authentication flow state
  const [step, setStep] = useState<"email" | "totp">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [verified, setVerified] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* Live TOTP rotation countdown while on the verify step */
  useEffect(() => {
    if (step !== "totp") return;
    const t = setInterval(() => setSecondsLeft(totpSecondsRemaining()), 250);
    return () => clearInterval(t);
  }, [step]);

  /* Focus the first OTP box when arriving on the verify step */
  useEffect(() => {
    if (step === "totp") otpRefs.current[0]?.focus();
  }, [step]);

  // Step 1: Handle Email submit and fetch/generate Google Authenticator QR Code
  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/totp/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to initialize authenticator");
      }

      setQrCodeUrl(json.data.qrCodeUrl);
      setSecretKey(json.data.secret);
      setShowQR(json.data.isNew);
      setDigits(Array(6).fill(""));
      setStep("totp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify the 6-digit code via NextAuth
  const verifyCode = async (code: string) => {
    if (code.length < 6 || isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("google-authenticator", {
        email,
        code,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth surfaces the authorize() error message; fall back to a friendly default
        const message =
          res.error !== "CredentialsSignin" && res.error.length < 160
            ? res.error
            : "That code didn't match. Check your authenticator app and try again.";
        throw new Error(message);
      }

      setVerified(true);
      setTimeout(() => router.push("/generate"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setShakeKey((k) => k + 1);
      setDigits(Array(6).fill(""));
      setIsLoading(false);
      otpRefs.current[0]?.focus();
    }
  };

  /* --- 6-box OTP input handlers --- */
  const setDigitAt = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    return next;
  };

  const handleDigitChange = (index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      setDigitAt(index, "");
      return;
    }
    if (error) setError(null);

    /* Multiple chars (fast typing / autofill): spread across boxes */
    const next = [...digits];
    let i = index;
    for (const ch of clean.split("")) {
      if (i > 5) break;
      next[i] = ch;
      i++;
    }
    setDigits(next);
    otpRefs.current[Math.min(i, 5)]?.focus();

    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        setDigitAt(index - 1, "");
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    if (error) setError(null);
    const next = Array(6)
      .fill("")
      .map((_, i) => pasted[i] ?? "");
    setDigits(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyCode(pasted);
  };

  const copySecret = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 1600);
  };

  const isLoggedIn = status === "authenticated" && !!session;
  const lowTime = secondsLeft <= 6;

  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full flex flex-col justify-center items-center py-6 sm:py-10 overflow-hidden bg-black selection:bg-white selection:text-black">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />
      {/* Soft ambient glow behind the card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-white/[0.035] blur-[110px] pointer-events-none" />

      {/* Main Hero Container */}
      <div className="relative z-10 w-full max-w-xl mx-auto text-center px-4 space-y-4 sm:space-y-5">
        {/* Floating ambient chips (large screens) */}
        {FLOATING_CHIPS.map(({ icon: Icon, label, className, delay }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, -12, 0] }}
            transition={{
              opacity: { duration: 0.8, delay: 0.6 + delay * 0.2 },
              y: { repeat: Infinity, duration: 5.5, ease: "easeInOut", delay },
            }}
            className={`hidden xl:flex absolute ${className} items-center gap-2 px-3 py-1.5 rounded-xl border border-neutral-800 bg-neutral-950/80 backdrop-blur text-neutral-400 text-[11px] font-mono shadow-lg pointer-events-none`}
          >
            <Icon className="w-3.5 h-3.5 text-neutral-300" />
            {label}
          </motion.div>
        ))}

        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono shadow-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>AI Logo Studio &amp; Brand Architect</span>
        </motion.div>

        {/* Word-by-word staggered headline */}
        <div className="pb-2 sm:pb-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight leading-snug flex flex-wrap justify-center gap-x-2.5 gap-y-1">
            {HEADLINE_WORDS.map((word, i) => (
              <motion.span
                key={`w-${i}`}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.45, delay: 0.15 + i * 0.07, ease: "easeOut" }}
                className="text-white"
              >
                {word}
              </motion.span>
            ))}
            {HEADLINE_ACCENT.map((word, i) => (
              <motion.span
                key={`a-${i}`}
                initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{
                  duration: 0.45,
                  delay: 0.15 + (HEADLINE_WORDS.length + i) * 0.07,
                  ease: "easeOut",
                }}
                className="bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: "easeOut" }}
            className="text-sm text-neutral-500 mt-3 max-w-md mx-auto"
          >
            Chat with the Architect agent, refine every detail on a pro canvas, and export
            studio-grade marks in minutes.
          </motion.p>
        </div>

        {/* Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="relative w-full max-w-lg mx-auto rounded-3xl border border-neutral-800 bg-[#0d0d0d] p-6 sm:p-8 shadow-2xl text-left mt-4 sm:mt-6 overflow-hidden"
        >
          {/* Gradient hairline across the card top */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-600 to-transparent" />

          {isLoggedIn ? (
            <div className="text-center space-y-4 py-3">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18 }}
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              </motion.div>
              <div>
                <h3 className="text-base font-semibold text-white">Welcome back</h3>
                <p className="text-xs text-neutral-400 mt-1 font-mono">{session.user?.email}</p>
              </div>
              <Button
                onClick={() => router.push("/generate")}
                variant="primary"
                size="lg"
                className="w-full font-semibold py-3 sm:py-3.5 text-sm sm:text-base"
              >
                <span>Enter Studio</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : verified ? (
            /* Post-verification success state */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-4 py-8"
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="w-16 h-16 mx-auto rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center"
              >
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </motion.div>
              <div>
                <h3 className="text-base font-semibold text-white">Identity verified</h3>
                <p className="text-xs text-neutral-500 mt-1 font-mono">
                  Opening your studio<span className="animate-pulse">...</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-5">
                {(
                  [
                    { id: "email", n: "01", label: "Email" },
                    { id: "totp", n: "02", label: "Verify" },
                  ] as const
                ).map((s) => {
                  const isActive = step === s.id;
                  const isDone = s.id === "email" && step === "totp";
                  return (
                    <div key={s.id} className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest">
                        <span className={isActive || isDone ? "text-white" : "text-neutral-600"}>
                          {isDone ? <Check className="w-3 h-3 inline text-emerald-400" /> : s.n}
                        </span>
                        <span className={isActive ? "text-neutral-300" : "text-neutral-600"}>
                          {s.label}
                        </span>
                      </div>
                      <div className="h-0.5 rounded-full bg-neutral-900 overflow-hidden">
                        <motion.div
                          initial={false}
                          animate={{ width: isActive || isDone ? "100%" : "0%" }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className={`h-full ${isDone ? "bg-emerald-400/70" : "bg-white"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <AnimatePresence mode="wait">
                {/* STEP 1: Email */}
                {step === "email" && (
                  <motion.form
                    key="email-form"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    onSubmit={handleEmailSubmit}
                    className="space-y-4 sm:space-y-5"
                  >
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                        <input
                          type="email"
                          required
                          autoFocus
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-2xl bg-black border border-neutral-800 pl-11 pr-4 py-3 sm:py-3.5 text-sm sm:text-base text-white placeholder-neutral-600 focus:border-neutral-400 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none transition-all"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-2">
                        Your authenticator app will be linked to this email.
                      </p>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs font-mono"
                      >
                        {error}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full font-semibold py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl"
                      isLoading={isLoading}
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>

                    <p className="text-[11px] text-neutral-600 text-center font-mono pt-1 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Protected by two-factor authentication
                    </p>
                  </motion.form>
                )}

                {/* STEP 2: 6-digit TOTP code */}
                {step === "totp" && (
                  <motion.form
                    key="totp-form"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      verifyCode(digits.join(""));
                    }}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setError(null);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Change email
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQR(!showQR)}
                        className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white font-mono transition-colors cursor-pointer underline underline-offset-2"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {showQR ? "Hide setup" : "Show setup QR"}
                      </button>
                    </div>

                    {/* QR Code Setup Panel */}
                    <AnimatePresence>
                      {showQR && qrCodeUrl && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 rounded-xl bg-black border border-neutral-800 space-y-3">
                            <div className="flex items-start gap-4">
                              <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="p-1.5 bg-white rounded-xl shadow-md shrink-0"
                              >
                                <Image
                                  src={qrCodeUrl}
                                  alt="Google Authenticator QR Code"
                                  width={110}
                                  height={110}
                                  unoptimized
                                />
                              </motion.div>
                              <div className="text-left space-y-1.5 text-[11px] text-neutral-400 leading-relaxed">
                                <p className="text-xs font-semibold text-neutral-200">
                                  First time here?
                                </p>
                                <p>
                                  <span className="text-neutral-500 font-mono">1.</span> Install{" "}
                                  <strong className="text-neutral-200">Google Authenticator</strong>
                                </p>
                                <p>
                                  <span className="text-neutral-500 font-mono">2.</span> Scan this QR
                                  code
                                </p>
                                <p>
                                  <span className="text-neutral-500 font-mono">3.</span> Enter the
                                  6-digit code below
                                </p>
                              </div>
                            </div>
                            {secretKey && (
                              <div className="flex items-center gap-2 pt-1 border-t border-neutral-900">
                                <p className="flex-1 text-[10px] text-neutral-600 font-mono truncate">
                                  {secretKey}
                                </p>
                                <button
                                  type="button"
                                  onClick={copySecret}
                                  className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-white px-2 py-1 rounded-md border border-neutral-800 hover:border-neutral-600 transition-colors cursor-pointer shrink-0"
                                >
                                  {copiedSecret ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" /> copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" /> copy key
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
                          Authenticator code
                        </label>
                        {/* Live TOTP rotation countdown */}
                        <span
                          className={`flex items-center gap-1.5 text-[10px] font-mono ${
                            lowTime ? "text-amber-400" : "text-neutral-500"
                          }`}
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" className="-rotate-90">
                            <circle
                              cx="8"
                              cy="8"
                              r="6"
                              fill="none"
                              stroke="currentColor"
                              strokeOpacity="0.25"
                              strokeWidth="2"
                            />
                            <circle
                              cx="8"
                              cy="8"
                              r="6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 6}
                              strokeDashoffset={2 * Math.PI * 6 * (1 - secondsLeft / 30)}
                              style={{ transition: "stroke-dashoffset 0.25s linear" }}
                            />
                          </svg>
                          rotates in {secondsLeft}s
                        </span>
                      </div>

                      {/* 6-box OTP input with shake-on-error */}
                      <motion.div
                        key={shakeKey}
                        animate={shakeKey > 0 ? { x: [0, -9, 9, -6, 6, -3, 0] } : { x: 0 }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                        className="flex items-center justify-between gap-2"
                        onPaste={handleOtpPaste}
                      >
                        {digits.map((digit, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              otpRefs.current[i] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            autoComplete={i === 0 ? "one-time-code" : "off"}
                            maxLength={6}
                            value={digit}
                            disabled={isLoading}
                            onChange={(e) => handleDigitChange(i, e.target.value)}
                            onKeyDown={(e) => handleDigitKeyDown(i, e)}
                            onFocus={(e) => e.target.select()}
                            className={`w-full aspect-[4/5] max-w-[56px] text-center font-mono text-xl sm:text-2xl rounded-xl bg-black border text-white caret-white focus:outline-none transition-all duration-150 disabled:opacity-50 ${
                              digit
                                ? "border-neutral-500 shadow-[0_0_0_3px_rgba(255,255,255,0.05)]"
                                : "border-neutral-800 focus:border-neutral-400 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)]"
                            }`}
                          />
                        ))}
                      </motion.div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs font-mono"
                      >
                        {error}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full font-semibold py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl"
                      isLoading={isLoading}
                      disabled={digits.some((d) => !d) || isLoading}
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify &amp; Enter Studio
                    </Button>

                    <p className="text-[11px] text-neutral-600 text-center font-mono">
                      Codes verify instantly once all six digits are entered.
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* Feature Highlights Row */}
        <div className="grid grid-cols-3 gap-2.5 pt-3">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.5 + i * 0.1, ease: "easeOut" }}
              whileHover={{ y: -3 }}
              className="p-3 rounded-xl bg-neutral-950 border border-neutral-900 hover:border-neutral-700 text-center space-y-1 transition-colors cursor-default"
            >
              <Icon className="w-4 h-4 text-neutral-400 mx-auto" />
              <p className="text-xs font-semibold text-white font-mono">{title}</p>
              <p className="text-[10px] text-neutral-500">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
