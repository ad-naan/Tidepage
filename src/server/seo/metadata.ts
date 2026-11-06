import "server-only";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getEnv } from "@/server/config/env";
import { site } from "@/shared/config/site";
import {
  getPublicSiteIdentity,
  getPersonalPage,
  getSitePage,
} from "@/modules/site-settings/server";
import type { SiteIdentity } from "@/modules/site-settings/domain/identity";
import {
  defaultLocale,
  locales,
  localeRegistry,
  localizedPath,
  type Locale,
} from "@/shared/i18n/config";
import type { Article } from "@/modules/content/domain/models";
export function absoluteUrl(path: string) {
  return new URL(path, getEnv().SITE_URL).toString();
}
export function localizedUrl(locale: Locale, path: string) {
  return absoluteUrl(localizedPath(locale, path));
}
export function languageAlternates(
  path: string,
  available: readonly Locale[] = locales,
) {
  const languages: Record<string, string> = {};
  for (const code of available)
    languages[localeRegistry[code].hreflang] = localizedUrl(code, path);
  if (available.includes(defaultLocale))
    languages["x-default"] = localizedUrl(defaultLocale, path);
  return languages;
}
export function pageMetadata(
  path: string,
  title: string = site.name,
  description: string = site.description,
  locale: Locale = defaultLocale,
  available: readonly Locale[] = locales,
  identity: SiteIdentity = site,
): Metadata {
  const fullTitle =
    path === "/" ? identity.title : `${title} · ${identity.name}`;
  return {
    title: { absolute: fullTitle },
    description,
    alternates: {
      canonical: localizedUrl(locale, path),
      languages: languageAlternates(path, available),
      types: { "application/rss+xml": `/feed.xml?locale=${locale}` },
    },
    robots: {
      index: getEnv().INDEXING_ENABLED,
      follow: getEnv().INDEXING_ENABLED,
    },
    openGraph: {
      type: "website",
      siteName: identity.name,
      locale: localeRegistry[locale].openGraph,
      url: localizedUrl(locale, path),
      title: fullTitle,
      description,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: identity.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
  };
}
const pages = {
  "/site": { title: "siteAbout.title", description: "siteAbout.description" },
  "/explore": { title: "world.name", description: "world.description" },
  "/friends": { title: "nav.friends", description: "friends.description" },
  "/": { title: "site.name", description: "site.description" },
  "/articles": { title: "nav.articles", description: "articles.description" },
  "/notes": { title: "nav.notes", description: "notes.description" },
  "/projects": { title: "nav.projects", description: "projects.description" },
  "/quotes": { title: "nav.quotes", description: "quotes.description" },
  "/gallery": { title: "nav.gallery", description: "gallery.description" },
  "/about": { title: "about.title", description: "about.description" },
} as const;
export async function getPageMetadata(path: keyof typeof pages) {
  const locale = await getLocale();
  const t = await getTranslations();
  const page = pages[path];
  const identity = await getPublicSiteIdentity(locale);
  const contentPage =
    path === "/about"
      ? await getPersonalPage(locale)
      : path === "/site"
        ? await getSitePage(locale)
        : null;
  return pageMetadata(
    path,
    contentPage?.title ?? t(page.title),
    contentPage?.intro ??
      (path === "/" ? identity.description : t(page.description)),
    locale,
    locales,
    identity,
  );
}
export async function articleMetadata(
  article: Article,
  available: readonly Locale[],
): Promise<Metadata> {
  const base = pageMetadata(
    `/articles/${article.slug}`,
    article.title,
    article.excerpt,
    article.locale,
    available,
    await getPublicSiteIdentity(article.locale),
  );
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      publishedTime: `${article.date}T00:00:00.000Z`,
      modifiedTime: article.updatedAt,
      authors: [site.author],
      tags: article.tags,
    },
  };
}
