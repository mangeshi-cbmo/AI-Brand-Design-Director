"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const THEME_QUERY = "(prefers-color-scheme: dark)";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const isLandingPage = pathname === "/" || pathname === "/login";

    if (isLandingPage) {
      // Landing & Login page is always forced to dark mode
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      return;
    }

    const media = window.matchMedia(THEME_QUERY);

    const applyTheme = () => {
      const savedTheme = localStorage.getItem("logoforge_theme");
      const theme =
        savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : media.matches
          ? "dark"
          : "light";

      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
      document.documentElement.style.colorScheme = theme;
    };

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [pathname]);

  return children;
}
