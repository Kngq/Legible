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
        // CSS modules keep Turbopack's own handling; `as: "*.css"` would turn them into
        // global CSS and leave every imported class name undefined.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
