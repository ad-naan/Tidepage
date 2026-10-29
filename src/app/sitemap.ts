import type { MetadataRoute } from "next";
import { getArticles } from "@/modules/content/server";
import { getEnv } from "@/server/config/env";
import { absoluteUrl } from "@/server/seo/metadata";
import { publicPages } from "@/shared/config/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!getEnv().INDEXING_ENABLED) return [];
  return [
    ...publicPages.map((p) => ({ url: absoluteUrl(p.path) })),
    ...(await getArticles()).map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      lastModified: a.updatedAt,
    })),
  ];
}
