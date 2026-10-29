import type { NextConfig } from "next";
import { resolve } from "node:path";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Explicit request-config alias supports both bundlers without the optional
  // native message-extraction compiler; messages are checked in CI instead.
  turbopack: { resolveAlias: { "next-intl/config": "./src/i18n/request.ts" } },
  webpack(config) {
    config.resolve.alias["next-intl/config"] = resolve("src/i18n/request.ts");
    return config;
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
