import "server-only";
import type { Metadata } from "next";
import { getEnv } from "../config/env";
import { site } from "@/shared/config/site";
import type { Article } from "@/modules/content/domain/models";
export function absoluteUrl(path: string) {
  return new URL(path, getEnv().SITE_URL).toString();
}
export function pageMetadata(
  path: string,
  title: string = site.name,
  description: string = site.description,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    robots: {
      index: getEnv().INDEXING_ENABLED,
      follow: getEnv().INDEXING_ENABLED,
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "zh_CN",
      url: absoluteUrl(path),
      title,
      description,
      images: [
        {
          url: absoluteUrl("/opengraph-image"),
          width: 1200,
          height: 630,
          alt: site.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl("/opengraph-image")],
    },
  };
}
export function articleMetadata(article: Article): Metadata {
  const base = pageMetadata(
    `/articles/${article.slug}`,
    article.title,
    article.excerpt,
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
