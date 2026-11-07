import type { MetadataRoute } from "next";
import { getArticles } from "@/modules/content/server";
import { getEnv } from "@/server/config/env";
import { languageAlternates, localizedUrl } from "@/server/seo/metadata";
import { locales, type Locale } from "@/shared/i18n/config";
import { navigationItems } from "@/shared/config/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!getEnv().INDEXING_ENABLED) return [];
  const articles = (
    await Promise.all(locales.map((locale) => getArticles(locale)))
  ).flat();
  const bySlug = new Map<string, Locale[]>();
  for (const { slug, locale } of articles) {
    const available = bySlug.get(slug);
    if (available) available.push(locale);
    else bySlug.set(slug, [locale]);
  }
  return [
    ...navigationItems.flatMap(({ href }) =>
      locales.map((locale) => ({
        url: localizedUrl(locale, href),
        alternates: { languages: languageAlternates(href) },
      })),
    ),
    ...articles.map((article) => {
      const path = `/articles/${article.slug}`;
      return {
        url: localizedUrl(article.locale, path),
        lastModified: article.updatedAt,
        alternates: {
          languages: languageAlternates(path, bySlug.get(article.slug)),
        },
      };
    }),
  ];
}
