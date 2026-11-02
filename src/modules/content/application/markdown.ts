import type { Article } from "@/modules/content/domain/models";
import { blockMarkdown } from "@/modules/content/domain/blocks";
import { documentMarkdown } from "@/modules/content/domain/document-presentation";
export function articleMarkdown(
  article: Article,
  canonicalUrl: string,
  labels: { published: string; updated: string; original: string },
) {
  const sections = article.body
    ? documentMarkdown(article.body)
    : article.sections
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
