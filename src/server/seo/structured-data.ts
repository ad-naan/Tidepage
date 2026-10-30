import "server-only";
import type { Article } from "@/modules/content/domain/models";
import { site } from "@/shared/config/site";
import { localizedUrl } from "./metadata";
import type { Locale } from "@/shared/i18n/config";
export function siteGraph(locale: Locale, labels: { name: string; description: string }) {
  const absoluteUrl=(path:string)=>localizedUrl(locale,path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": absoluteUrl("/#author"),
        name: site.author,
        url: absoluteUrl("/about"),
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        name: labels.name,
        description: labels.description,
        url: absoluteUrl("/"),
        inLanguage: locale,
        publisher: { "@id": absoluteUrl("/#author") },
      },
    ],
  };
}
export function articleGraph(article: Article, labels: { home: string; articles: string; category: string }) {
  const absoluteUrl=(path:string)=>localizedUrl(article.locale,path);
  const url = absoluteUrl(`/articles/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: article.title,
        description: article.excerpt,
        inLanguage: article.locale,
        datePublished: `${article.date}T00:00:00.000Z`,
        dateModified: article.updatedAt,
        author: {
          "@type": "Person",
          name: site.author,
          url: absoluteUrl("/about"),
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        keywords: article.tags.join(", "),
        articleSection: labels.category,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: labels.home,
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: labels.articles,
            item: absoluteUrl("/articles"),
          },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
