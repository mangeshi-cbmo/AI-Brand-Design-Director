import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Brand Asset Gallery & History",
  description:
    "Explore your saved brand identities, generated logos, brand guidelines, color palettes, and production SVG assets.",
  alternates: {
    canonical: `${siteConfig.url}/history`,
  },
  openGraph: {
    title: `Brand Asset Gallery & History | ${siteConfig.name}`,
    description:
      "Explore your saved brand identities, generated logos, brand guidelines, and production SVG assets.",
    url: `${siteConfig.url}/history`,
  },
  twitter: {
    title: `Brand Asset Gallery & History | ${siteConfig.name}`,
    description:
      "Explore your saved brand identities, generated logos, brand guidelines, and production SVG assets.",
  },
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
