import type { NextConfig } from "next";

// Served at the site root in production; the preview mounts it under /landing.
const basePath = process.env.LANDING_BASE_PATH ?? "";

import path from "node:path";

const root = path.resolve(process.cwd(), "..");

const nextConfig: NextConfig = {
  transpilePackages: ["@called/sdk"],
  outputFileTracingRoot: root,
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
  output: "export",
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: { root, rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } } },
};

export default nextConfig;
