import type { NextConfig } from "next";
import { resolve } from "node:path";
import legacyAssets from "./src/shared/config/legacy-assets.json";
const nextConfig: NextConfig = {
  // Docker 部署使用 .next/standalone 独立产物；本地 dev / next start 不受影响。
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingExcludes: {
    "/*": [
      "./storage/**/*",
      "./backups/**/*",
      "./.cache/**/*",
      "./assets/source/**/*",
      "./artifacts/**/*",
      "./.env*",
    ],
  },
  outputFileTracingIncludes: {
    "/api/v1/media": [
      "./node_modules/.pnpm/@img+sharp-*/node_modules/@img/sharp-*/lib/**/*",
    ],
  },
  // Explicit request-config alias supports both bundlers without the optional
  // native message-extraction compiler; messages are checked in CI instead.
  turbopack: { resolveAlias: { "next-intl/config": "./src/i18n/request.ts" } },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = resolve("src/i18n/request.ts");
    return config;
  },
  async rewrites() {
    return Object.entries(legacyAssets).map(([source, destination]) => ({
      source,
      destination,
    }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default nextConfig;
