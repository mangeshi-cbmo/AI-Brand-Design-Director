import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { siteConfig } from "@/config/site";
import { SessionProvider } from "@/components/providers/session-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${siteConfig.name} - AI Brand Architect & Logo Studio`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${inter.className} min-h-screen flex flex-col bg-black text-white antialiased selection:bg-white selection:text-black`}
      >
        <SessionProvider>
          <Navbar />
          <main className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col">
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
