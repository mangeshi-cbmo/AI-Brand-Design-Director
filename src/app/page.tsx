"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  QrCode,
  ShieldCheck,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Compass,
  Layers,
  Sparkles,
  Download,
  PenTool,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Authentication form state
  const [step, setStep] = useState<"email" | "totp">("email");
  const [email, setEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Handle Email submit and fetch/generate Google Authenticator QR Code
  const handleEmailSubmit = async (e: React.FormEvent) => {
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
      if (json.data.isNew) {
        setShowQR(true);
      }
      setStep("totp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify Google Authenticator 6-digit code via NextAuth
  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length < 6) {
      setError("Please enter the full 6-digit code from Google Authenticator");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn("google-authenticator", {
        email,
        code: totpCode,
        redirect: false,
      });

      if (res?.error) {
        throw new Error("Invalid 6-digit code. Please check your Google Authenticator app.");
      }

      router.push("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setIsLoading(false);
    }
  };

  const isLoggedIn = status === "authenticated" && !!session;

  return (
    <div className="relative min-h-[calc(100vh-10rem)] w-full flex flex-col justify-center items-center py-6 sm:py-10 overflow-hidden bg-black selection:bg-white selection:text-black">
      {/* Background Radial & Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#141414_1px,transparent_1px),linear-gradient(to_bottom,#141414_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Hero Container */}
      <div className="relative z-10 w-full max-w-xl mx-auto text-center px-4 space-y-4 sm:space-y-5">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono shadow-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span>AI Logo Studio & Brand Architect</span>
        </motion.div>

        {/* Stable Headline (No Layout Shift) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="pb-4 sm:pb-6"
        >
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-snug">
            Create unique logos with pure simplicity.
          </h1>
        </motion.div>

        {/* Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-lg mx-auto rounded-3xl border border-neutral-800 bg-[#0d0d0d] p-6 sm:p-8 shadow-2xl text-left mt-6 sm:mt-8"
        >
          {isLoggedIn ? (
            <div className="text-center space-y-4 py-3">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="w-12 h-12 text-white mx-auto" />
              </motion.div>
              <div>
                <h3 className="text-base font-semibold text-white">Authenticated Session</h3>
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
          ) : (
            <AnimatePresence mode="wait">
              {/* STEP 1: Enter Email */}
              {step === "email" && (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleEmailSubmit}
                  className="space-y-4 sm:space-y-5"
                >
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 sm:py-3.5 text-sm sm:text-base text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all"
                    />
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

                  <p className="text-xs text-neutral-500 text-center font-mono pt-1">
                    Secure Two-Factor Authentication
                  </p>
                </motion.form>
              )}

              {/* STEP 2: Google Authenticator TOTP 6-Digit Code */}
              {step === "totp" && (
                <motion.form
                  key="totp-form"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleVerifyTOTP}
                  className="space-y-3.5"
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
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQR(!showQR)}
                      className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white font-mono transition-colors cursor-pointer underline"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {showQR ? "Hide QR Code" : "Show QR Code"}
                    </button>
                  </div>

                  {/* QR Code Setup Panel */}
                  {showQR && qrCodeUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-3.5 rounded-xl bg-black border border-neutral-800 text-center space-y-2.5"
                    >
                      <p className="text-xs text-neutral-300">
                        Scan with the <strong>Google Authenticator</strong> app:
                      </p>
                      <div className="inline-block p-2 bg-white rounded-xl shadow-md">
                        <Image
                          src={qrCodeUrl}
                          alt="Google Authenticator QR Code"
                          width={130}
                          height={130}
                          unoptimized
                        />
                      </div>
                      {secretKey && (
                        <p className="text-[10px] text-neutral-500 font-mono break-all">
                          Secret: {secretKey}
                        </p>
                      )}
                    </motion.div>
                  )}

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-neutral-300" />
                      Enter 6-Digit Code from Authenticator
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      placeholder="e.g. 123456"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      className="w-full text-center tracking-[0.5em] font-mono text-xl sm:text-2xl rounded-2xl bg-black border border-neutral-800 px-4 py-3 sm:py-3.5 text-white placeholder-neutral-700 focus:border-white focus:outline-none transition-all"
                    />
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
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Verify & Enter Studio
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Feature Highlights Row */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          className="grid grid-cols-3 gap-2.5 pt-3"
        >
          <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-900 text-center space-y-0.5">
            <p className="text-xs font-semibold text-white font-mono">Agent Chat</p>
            <p className="text-[10px] text-neutral-500">Autonomous design</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-900 text-center space-y-0.5">
            <p className="text-xs font-semibold text-white font-mono">Canvas Editor</p>
            <p className="text-[10px] text-neutral-500">Custom typography</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0a0a0a] border border-neutral-900 text-center space-y-0.5">
            <p className="text-xs font-semibold text-white font-mono">Export Kit</p>
            <p className="text-[10px] text-neutral-500">High-res PNG & SVG</p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
