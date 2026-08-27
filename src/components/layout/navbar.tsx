"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { History, Layers, LogOut } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const handleLogout = async () => {
    // Clear next-auth session and any local storage
    if (typeof window !== "undefined") {
      localStorage.removeItem("logoforge_user");
    }
    await signOut({ callbackUrl: "/" });
  };

  const user = session?.user;

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

        {user && (
          <nav className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/generate"
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${pathname === "/generate" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Studio
            </Link>

            <Link
              href="/history"
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${pathname === "/history" ? "text-white" : "text-neutral-400 hover:text-white"
                }`}
            >
              <History className="w-3.5 h-3.5" />
              My Logos
            </Link>

            <div className="flex items-center gap-3 pl-3 border-l border-neutral-800">
              <div className="hidden sm:flex items-center gap-2">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-6 h-6 rounded-full object-cover border border-neutral-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-white text-[10px] font-semibold border border-neutral-700">
                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="text-xs text-neutral-300 font-medium truncate max-w-[140px]">
                  {user.name || user.email}
                </span>
              </div>

              {/* Explicit Clean Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all cursor-pointer"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
