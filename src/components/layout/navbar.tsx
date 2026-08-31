"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  History,
  Layers,
  LogOut,
  User as UserIcon,
  Mail,
  ShieldCheck,
  Copy,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { TokenUsageBadge } from "@/components/logo-generator/token-usage-card";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("logoforge_user");
    }
    await signOut({ callbackUrl: "/" });
  };

  const user = session?.user;

  const handleCopyEmail = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user?.email) {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
        setShowLogoutConfirm(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
        setShowLogoutConfirm(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md">
      <div className="w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={user ? "/generate" : "/"} className="flex items-center gap-3 group">
          <div className="relative w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <Image
              src="/logo.jpeg"
              alt={siteConfig.name}
              width={32}
              height={32}
              priority
              className="object-contain w-full h-full"
            />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">
            {siteConfig.name}
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {user && <TokenUsageBadge />}
          {user && pathname !== "/" && <ThemeToggle />}
          {user && (
            <nav className="flex items-center gap-2 sm:gap-6">
              <Link
                href="/generate"
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  pathname === "/generate" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Studio</span>
              </Link>

              <Link
                href="/history"
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  pathname === "/history" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">My Logos</span>
              </Link>

              {/* Profile Dropdown Trigger */}
              <div className="relative pl-2 sm:pl-3 border-l border-neutral-800" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen((prev) => !prev);
                    if (isProfileOpen) setShowLogoutConfirm(false);
                  }}
                  className={`flex items-center gap-2 py-1 px-2 rounded-xl transition-all cursor-pointer border ${
                    isProfileOpen
                      ? "bg-neutral-900 border-neutral-700 ring-2 ring-neutral-700/50 text-white"
                      : "bg-neutral-950/80 hover:bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white"
                  }`}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                  title="View Profile Information"
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name || "User"}
                      className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center text-white text-[10px] font-bold border border-neutral-700">
                      {initials}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-medium truncate max-w-[120px]">
                    {user.name || user.email?.split("@")[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-200 ${
                      isProfileOpen ? "rotate-180 text-white" : ""
                    }`}
                  />
                </button>

                {/* Profile Dropdown Card */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl shadow-black/80 backdrop-blur-xl z-50 p-3 text-white animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                    {/* Header / Avatar & Identity */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-neutral-900/60 border border-neutral-800/80 mb-1.5">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name || "User"}
                          className="w-10 h-10 rounded-xl object-cover border border-neutral-700 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neutral-700 via-neutral-800 to-neutral-950 flex items-center justify-center text-white text-sm font-bold border border-neutral-700 shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-semibold text-white truncate">
                            {user.name || user.email?.split("@")[0]}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                            <span>2FA</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[11px] text-neutral-400 truncate flex-1 font-mono">
                            {user.email || "No email"}
                          </p>
                          {user.email && (
                            <button
                              type="button"
                              onClick={handleCopyEmail}
                              className="p-0.5 rounded text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Copy email"
                            >
                              {copiedEmail ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Navigation Links inside Profile */}
                    <div className="space-y-0.5 py-1 border-t border-neutral-800/60">
                      <Link
                        href="/generate"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-neutral-400" />
                          <span>Brand Studio</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono">Create</span>
                      </Link>

                      <Link
                        href="/history"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <History className="w-4 h-4 text-neutral-400" />
                          <span>Logo Gallery</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono">Gallery</span>
                      </Link>
                    </div>

                    {/* Logout Area with Confirmation */}
                    <div className="pt-1.5 border-t border-neutral-800/60 mt-1">
                      {!showLogoutConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowLogoutConfirm(true)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign out</span>
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-center animate-in fade-in zoom-in-95 duration-100">
                          <p className="text-xs font-medium text-white mb-1">
                            Sign out of account?
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => setShowLogoutConfirm(false)}
                              className="flex-1 py-1 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="flex-1 py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-medium transition-colors shadow-sm cursor-pointer"
                            >
                              Sign out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
