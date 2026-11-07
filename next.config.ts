import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pure client-side portal: every page ships as a static asset and talks to
  // the Payload API directly from the browser.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
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
