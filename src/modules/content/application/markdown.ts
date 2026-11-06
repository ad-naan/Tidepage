import type { Article } from "@/modules/content/domain/models";
import { articleDocument } from "@/modules/content/domain/legacy-draft";
import { documentMarkdown } from "@/modules/content/domain/document-presentation";
export function articleMarkdown(
  article: Article,
  canonicalUrl: string,
  labels: { published: string; updated: string; original: string },
) {
  const sections = documentMarkdown(articleDocument(article));
  return `# ${article.title}\n\n${article.excerpt}\n\n${labels.published}: ${article.date}\n${labels.updated}: ${article.updatedAt}\n${labels.original}: ${canonicalUrl}\n\n${sections}\n`;
}
