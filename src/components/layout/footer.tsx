import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="border-t border-neutral-900 bg-black mt-auto py-5">
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <span className="text-xs text-neutral-500 font-mono">
          {siteConfig.name} &copy; {new Date().getFullYear()} — AI Brand Identity Studio
        </span>
      </div>
    </footer>
  );
}
