import type { Article } from "./models";
import {
  embedSchema,
  newArticle,
  type EditorNode,
  type ArticleDraft,
} from "./editor-document";
const paragraph = (text: string): EditorNode => ({
  type: "paragraph",
  content: text ? [{ type: "text", text }] : [],
});
export function articleDocument(
  article: Pick<Article, "body" | "sections">,
): EditorNode {
  if (article.body) return article.body;
  const content: EditorNode[] = [];
  for (const section of article.sections) {
    content.push(
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: section.title }],
      },
      ...section.paragraphs.map(paragraph),
    );
    for (const block of section.blocks ?? []) {
      if (block.type === "code")
        content.push({
          type: "codeBlock",
          attrs: { language: block.language, caption: block.caption ?? "" },
          content: block.code ? [{ type: "text", text: block.code }] : [],
        });
      else if (block.type === "callout")
        content.push({
          type: "callout",
          attrs: { title: block.title, tone: block.tone },
          content: [paragraph(block.text)],
        });
      else
        content.push({
          type: "referenceCard",
          attrs: embedSchema.parse(
            block.type === "movie"
              ? {
                  kind: "movie",
                  title: block.title,
                  url: block.url,
                  description: block.note,
                  creator: block.director,
                  year: String(block.year),
                  originalTitle: block.originalTitle,
                  artworkUrl: block.artwork,
                  artworkAlt: block.artworkAlt,
                }
              : {
                  kind: "web",
                  title: block.title,
                  url: block.url,
                  description: block.description,
                  siteName: block.siteName,
                  artworkUrl: block.image,
                  artworkAlt: block.imageAlt,
                },
          ),
        });
    }
  }
  return { type: "doc", content };
}

/** Import published legacy content into a separate local working copy, preserving block metadata. */
export function legacyArticlesToDraft(articles: Article[]): ArticleDraft {
  if (!articles.length) throw new Error("EMPTY_IMPORT");
  const first = articles[0];
  const draft = newArticle(`import-${first.slug}`, first.updatedAt);
  draft.category = first.category;
  draft.sketch = first.sketch;
  draft.minutes = first.minutes;
  draft.author = first.publication?.author || draft.author;
  draft.coverAssetId = first.publication?.cover?.assetId ?? "";
  draft.publishedAt = `${first.date}T12:00`;
  for (const article of articles) {
    const body = articleDocument(article);
    draft.translations[article.locale] = {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      body,
      tags: article.tags,
      seoTitle: article.publication?.seoTitle ?? "",
      seoDescription: article.publication?.seoDescription ?? "",
      coverAlt: article.publication?.cover?.alt ?? "",
      afterword: article.publication?.afterword,
    };
  }
  return draft;
}
