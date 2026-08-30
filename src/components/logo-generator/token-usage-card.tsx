"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap } from "lucide-react";

export function TokenUsageBadge() {
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.data?.summary) {
        setTotalTokens(json.data.summary.totalTokens || 0);
      }
    } catch {
      // Ignore network errors silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchUsage, 0);
    // Refresh periodically to reflect tokens consumed during generation
    const interval = setInterval(fetchUsage, 8000);
    window.addEventListener("focus", fetchUsage);
    window.addEventListener("token-usage-updated", fetchUsage);
    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(interval);
      window.removeEventListener("focus", fetchUsage);
      window.removeEventListener("token-usage-updated", fetchUsage);
    };
  }, [fetchUsage]);

  if (isLoading && totalTokens === null) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 shadow-sm transition-all select-none"
      title="Total Gemini Tokens Consumed"
    >
      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20 shrink-0" />
      <div className="flex items-center gap-1">
        <span className="font-semibold text-white font-mono text-[11px] sm:text-xs">
          {(totalTokens ?? 0).toLocaleString()}
        </span>
        <span className="text-[10px] sm:text-[11px] text-neutral-400 font-medium">Tokens</span>
      </div>
    </div>
  );
}

export { TokenUsageBadge as TokenUsageCard };
