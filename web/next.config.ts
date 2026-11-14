import path from "node:path";
import type { NextConfig } from "next";

// The SDK is a sibling folder linked via file:../sdk, so the workspace root is one level up.
const root = path.resolve(process.cwd(), "..");
// Mounted under /app when the marketing site owns the root.
const basePath = process.env.APP_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "polymarket-upload.s3.us-east-2.amazonaws.com" }] },
  transpilePackages: ["@called/sdk"],
  outputFileTracingRoot: root,
  turbopack: {
    root,
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
