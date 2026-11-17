import type { Metadata, Viewport } from "next";
import { Orbitron, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { HydrationMark } from "@/components/HydrationMark";

const display = Orbitron({ subsets: ["latin"], variable: "--font-display", weight: ["500", "700", "900"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "BTN TV STREAMZ — Premium IPTV Reseller Platform", template: "%s | BTN TV STREAMZ" },
  description: "Compare IPTV reseller panels, buy wholesale credits and manage customers, subscriptions and renewals in one premium reseller platform. Serving the UAE, Philippines and worldwide.",
  openGraph: { type: "website", siteName: "BTN TV STREAMZ" },
  robots: { index: true, follow: true },
};
export const viewport: Viewport = { themeColor: "#080808" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const analytics = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN;
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="min-h-screen font-sans">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-crimson focus:px-4 focus:py-2">Skip to content</a>
        {children}
        <HydrationMark />
        {analytics && <Script defer data-domain={analytics} src={process.env.NEXT_PUBLIC_ANALYTICS_SRC} strategy="afterInteractive" />}
      </body>
    </html>
  );
}
