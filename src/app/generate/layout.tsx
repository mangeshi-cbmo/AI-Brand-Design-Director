import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "AI Studio & Generator",
  description:
    "Interactive AI brand identity studio and vector logo generator. Co-create brand marks, adjust geometry, customize typography, and generate complete guidelines.",
  alternates: {
    canonical: `${siteConfig.url}/generate`,
  },
  openGraph: {
    title: `AI Studio & Generator | ${siteConfig.name}`,
    description:
      "Interactive AI brand identity studio and vector logo generator. Co-create brand marks, adjust geometry, and generate complete guidelines.",
    url: `${siteConfig.url}/generate`,
  },
  twitter: {
    title: `AI Studio & Generator | ${siteConfig.name}`,
    description:
      "Interactive AI brand identity studio and vector logo generator.",
  },
};

export default function GenerateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
