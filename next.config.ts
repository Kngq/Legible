import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Development guidance lives in .kiro/steering/; do not generate AGENTS.md.
  agentRules: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
