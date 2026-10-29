import "server-only";
import type { Article } from "@/modules/content/domain/models";
import { site } from "@/shared/config/site";
import { absoluteUrl } from "./metadata";
export function siteGraph() {
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
        name: site.name,
        url: absoluteUrl("/"),
        inLanguage: site.language,
        publisher: { "@id": absoluteUrl("/#author") },
      },
    ],
  };
}
export function articleGraph(article: Article) {
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
        inLanguage: site.language,
        datePublished: `${article.date}T00:00:00.000Z`,
        dateModified: article.updatedAt,
        author: {
          "@type": "Person",
          name: site.author,
          url: absoluteUrl("/about"),
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        keywords: article.tags.join(", "),
        articleSection: article.category,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "首页",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "文章",
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
