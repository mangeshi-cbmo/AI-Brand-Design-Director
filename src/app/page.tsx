"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, QrCode, ShieldCheck, KeyRound, ArrowLeft, CheckCircle2 } from "lucide-react";
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
      // If it's a first-time setup, show QR code by default
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

      // Success -> navigate to Studio
      router.push("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setIsLoading(false);
    }
  };

  const isLoggedIn = status === "authenticated" && !!session;

  return (
    <div className="relative min-h-[calc(100vh-12rem)] flex flex-col justify-center items-center py-10 sm:py-16 overflow-hidden bg-black">
      {/* Main Hero Container */}
      <div className="w-full max-w-xl mx-auto text-center px-4 space-y-8">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-mono"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          <span>AI Logo Studio</span>
        </motion.div>

        {/* Clean Pure Black & White Typography */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-[1.15]">
            Create unique logos with pure simplicity.
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-md mx-auto">
            Generate clean, production-ready vector logos for your project or startup in seconds.
          </p>
        </motion.div>

        {/* Authentication Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-md mx-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl text-left"
        >
          {isLoggedIn ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle2 className="w-10 h-10 text-white mx-auto" />
              <div>
                <h3 className="text-base font-semibold text-white">Already Authenticated</h3>
                <p className="text-xs text-neutral-400 mt-1">{session.user?.email}</p>
              </div>
              <Button
                onClick={() => router.push("/generate")}
                variant="primary"
                size="md"
                className="w-full"
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
                  onSubmit={handleEmailSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-black border border-neutral-800 px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
                    isLoading={isLoading}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-[11px] text-neutral-500 text-center">
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
                  onSubmit={handleVerifyTOTP}
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
                    <div className="p-4 rounded-xl bg-black border border-neutral-800 text-center space-y-3">
                      <p className="text-xs text-neutral-300">
                        Scan with the <strong>Google Authenticator</strong> app on your phone:
                      </p>
                      <div className="inline-block p-2 bg-white rounded-xl">
                        <Image
                          src={qrCodeUrl}
                          alt="Google Authenticator QR Code"
                          width={150}
                          height={150}
                          unoptimized
                        />
                      </div>
                      {secretKey && (
                        <p className="text-[10px] text-neutral-500 font-mono break-all">
                          Secret: {secretKey}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-1.5 flex items-center gap-1.5">
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
                      className="w-full text-center tracking-[0.5em] font-mono text-xl rounded-xl bg-black border border-neutral-800 px-4 py-2.5 text-white placeholder-neutral-700 focus:border-white focus:outline-none transition-all"
                    />
                  </div>

                  {error && (
                    <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full"
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

      </div>
    </div>
  );
}
