import type { MetadataRoute } from "next";
import { getEnv } from "@/server/config/env";
import { absoluteUrl } from "@/server/seo/metadata";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return getEnv().INDEXING_ENABLED
    ? {
        rules: {
          userAgent: "*",
          allow: "/",
          disallow: ["/api/", "/admin/", "/explore"],
        },
        sitemap: absoluteUrl("/sitemap.xml"),
        host: new URL(getEnv().SITE_URL).origin,
      }
    : { rules: { userAgent: "*", disallow: "/" } };
}
