import type { ArticleTranslation, EditorNode } from "./editor-document";

const textAttributes: Record<string, string[]> = {
  assetImage: ["alt", "caption"],
  referenceCard: ["title", "description", "artworkAlt"],
  callout: ["title"],
  details: ["summary"],
};

function mapTranslation(
  source: ArticleTranslation,
  replace: (text: string) => string,
): ArticleTranslation {
  function visit(node: EditorNode): EditorNode {
    if (
      node.type === "codeBlock" ||
      node.marks?.some((mark) => mark.type === "code")
    )
      return node;
    const attrs = node.attrs && { ...node.attrs };
    if (attrs) {
      for (const key of textAttributes[node.type] ?? []) {
        if (typeof attrs[key] === "string") attrs[key] = replace(attrs[key]);
      }
    }
    return {
      ...node,
      ...(node.text && { text: replace(node.text) }),
      ...(attrs && { attrs }),
      ...(node.content && { content: node.content.map(visit) }),
    };
  }
  return {
    ...source,
    title: replace(source.title),
    excerpt: replace(source.excerpt),
    seoTitle: replace(source.seoTitle),
    seoDescription: replace(source.seoDescription),
    coverAlt: replace(source.coverAlt),
    tags: source.tags.map(replace),
    body: visit(source.body),
  };
}

export function translationSegments(source: ArticleTranslation) {
  const segments: string[] = [];
  mapTranslation(source, (value) => {
    if (value.trim()) segments.push(value);
    return value;
  });
  return segments;
}

export function applyTranslationSegments(
  source: ArticleTranslation,
  translated: string[],
) {
  let index = 0;
  const result = mapTranslation(source, (value) =>
    value.trim() ? (translated[index++] ?? "") : value,
  );
  if (index !== translated.length)
    throw new Error("TRANSLATION_SEGMENT_MISMATCH");
  return result;
}
