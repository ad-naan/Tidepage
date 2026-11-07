import type { ArticleSummary } from "@/modules/content/domain/models";

export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character]!,
  );
}

export function articleFeedItem(
  article: Pick<ArticleSummary, "title" | "excerpt" | "date">,
  url: string,
) {
  return {
    title: article.title,
    description: article.excerpt,
    url,
    pubDate: new Date(article.date).toUTCString(),
  };
}

export function renderArticleFeedItem(
  item: ReturnType<typeof articleFeedItem>,
) {
  const url = escapeXml(item.url);
  return `<item><title>${escapeXml(item.title)}</title><link>${url}</link><guid>${url}</guid><description>${escapeXml(item.description)}</description><pubDate>${item.pubDate}</pubDate></item>`;
}
