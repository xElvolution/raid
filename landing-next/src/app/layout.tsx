import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Called · Call it. Prove it.",
  description: "The social prediction market. Turn your takes into markets, trade the odds with friends, and get results from verifiable AI on NEAR.",
  openGraph: { title: "Called · Call it. Prove it.", description: "The social prediction market on NEAR.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#07080b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased scroll-smooth`}>
      <body>{children}</body>
    </html>
  );
}
