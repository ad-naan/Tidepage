import type { MetadataRoute } from "next";
import { getArticles } from "@/modules/content/server";
import { getEnv } from "@/server/config/env";
import { languageAlternates, localizedUrl } from "@/server/seo/metadata";
import { locales } from "@/shared/i18n/config";
import { publicPages } from "@/shared/config/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!getEnv().INDEXING_ENABLED) return [];
  const articles = (await Promise.all(locales.map((locale) => getArticles(locale)))).flat();
  return [
    ...publicPages.flatMap((page) => locales.map((locale) => ({
      url: localizedUrl(locale, page.path),
      alternates: { languages: languageAlternates(page.path) },
    }))),
    ...articles.map((article) => {
      const path = `/articles/${article.slug}`;
      const available = locales.filter((locale) => articles.some((candidate) => candidate.slug === article.slug && candidate.locale === locale));
      return {
        url: localizedUrl(article.locale, path),
        lastModified: article.updatedAt,
        alternates: { languages: languageAlternates(path, available) },
      };
    }),
  ];
}
