import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Inter, JetBrains_Mono } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { Overlays } from "@/components/Overlays";
import { Providers } from "@/lib/session";
import { MotionRoot, TransitionWatcher } from "@/lib/transition";
import { ThemeProvider, themeBootScript } from "@/lib/theme";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
/** Broadcast direction: condensed display caps for hero numbers and titles, mono for data. */
const display = Big_Shoulders({ variable: "--font-bc", subsets: ["latin"], weight: ["700", "800", "900"] });
const mono = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · the social prediction market`, template: `%s · ${BRAND.name}` },
  description: "Turn your takes into markets. Trade the odds with friends. Resolved by verifiable AI on NEAR.",
  applicationName: BRAND.name,
};

export const viewport: Viewport = { themeColor: "#000000", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${display.variable} ${mono.variable} antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><ThemeProvider><Providers><MotionRoot>{children}<Overlays /><TransitionWatcher /></MotionRoot></Providers></ThemeProvider></body>
    </html>
  );
}
