import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@near-wallet-selector/modal-ui/styles.css";
import "./globals.css";
import { BRAND } from "@/lib/brand";
import { Providers } from "@/lib/session";
import { MotionRoot } from "@/lib/transition";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import { CallRaidSheet } from "@/components/CallRaid";
import { RaidHitOverlay } from "@/components/Overlays";
import { ComposerSheet } from "@/components/app/Composer";
import { Onboarding, SignInSheet } from "@/components/app/SignIn";
import { JoinSheet, ClaimSheet } from "@/components/app/Flow";
import { Toaster } from "@/components/Shell";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · Call it. Crew up. Cash out at the line.`, template: `%s · ${BRAND.name}` },
  description: BRAND.pitch,
  applicationName: BRAND.name,
};

export const viewport: Viewport = { themeColor: "#f2f1ec", width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light" className={`${geist.variable} ${geistMono.variable} antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><ThemeProvider><Providers><MotionRoot>{children}<CallRaidSheet /><ComposerSheet /><SignInSheet /><JoinSheet /><ClaimSheet /><Onboarding /><RaidHitOverlay /><Toaster /></MotionRoot></Providers></ThemeProvider></body>
    </html>
  );
}
