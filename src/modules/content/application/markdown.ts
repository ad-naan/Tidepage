import type { Article } from "../domain/models";
import { blockMarkdown } from "../domain/blocks";
export function articleMarkdown(
  article: Article,
  canonicalUrl: string,
  labels: { published: string; updated: string; original: string },
) {
  const sections = article.sections
    .map((section) =>
      [
        `## ${section.title}`,
        ...section.paragraphs,
        ...(section.blocks || []).map(blockMarkdown),
      ].join("\n\n"),
    )
    .join("\n\n");
  return `# ${article.title}\n\n${article.excerpt}\n\n${labels.published}: ${article.date}\n${labels.updated}: ${article.updatedAt}\n${labels.original}: ${canonicalUrl}\n\n${sections}\n`;
}
