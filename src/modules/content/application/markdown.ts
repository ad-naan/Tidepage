import type { Article } from "../domain/models";
export function articleMarkdown(
  article: Article,
  canonicalUrl: string,
  labels: { published: string; updated: string; original: string },
) {
  return `# ${article.title}\n\n${article.excerpt}\n\n${labels.published}: ${article.date}\n${labels.updated}: ${article.updatedAt}\n${labels.original}: ${canonicalUrl}\n\n${article.sections.map((s) => `## ${s.title}\n\n${s.paragraphs.join("\n\n")}`).join("\n\n")}\n`;
}
