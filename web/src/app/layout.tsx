import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { Providers } from "@/lib/session";
import { MotionRoot } from "@/lib/transition";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { CallRaidSheet } from "@/components/CallRaid";
import { RaidHitOverlay } from "@/components/Overlays";
import { Toaster } from "@/components/Shell";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
/** Wide grotesk caps for hero moments (Archivo at 125% width). */
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const mono = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · Call it. Crew up. Cash out at the line.`, template: `%s · ${BRAND.name}` },
  description: BRAND.pitch,
  applicationName: BRAND.name,
};

export const viewport: Viewport = { themeColor: "#04061a", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="dark" className={`${inter.variable} ${archivo.variable} ${mono.variable} antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><ThemeProvider><Providers><MotionRoot>{children}<CallRaidSheet /><RaidHitOverlay /><Toaster /></MotionRoot></Providers></ThemeProvider></body>
    </html>
  );
}
