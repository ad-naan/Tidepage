import type { Article } from "../domain/models";
export function articleMarkdown(article: Article, canonicalUrl: string) {
  return `# ${article.title}\n\n${article.excerpt}\n\n发布日期：${article.date}\n更新日期：${article.updatedAt}\n原文：${canonicalUrl}\n\n${article.sections.map((s) => `## ${s.title}\n\n${s.paragraphs.join("\n\n")}`).join("\n\n")}\n`;
}
