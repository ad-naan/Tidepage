import type { ArticleTranslation, EditorNode } from "./editor-document";

const textAttributes: Record<string, Record<string, number | undefined>> = {
  assetImage: { alt: undefined, caption: undefined },
  referenceCard: { title: 200, description: 2000, artworkAlt: 300 },
  callout: { title: undefined },
  details: { summary: 300 },
};

function mapTranslation(
  source: ArticleTranslation,
  replace: (text: string, limit?: number) => string,
): ArticleTranslation {
  function visit(node: EditorNode): EditorNode {
    if (
      node.type === "codeBlock" ||
      node.marks?.some((mark) => mark.type === "code")
    )
      return node;
    const attrs = node.attrs && { ...node.attrs };
    if (attrs) {
      for (const [key, limit] of Object.entries(
        textAttributes[node.type] ?? {},
      )) {
        if (typeof attrs[key] === "string")
          attrs[key] = replace(attrs[key], limit);
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
    title: replace(source.title, 200),
    excerpt: replace(source.excerpt, 1200),
    seoTitle: replace(source.seoTitle, 200),
    seoDescription: replace(source.seoDescription, 1200),
    coverAlt: replace(source.coverAlt, 300),
    tags: source.tags.map((tag) => replace(tag, 60)),
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
  const result = mapTranslation(source, (value, limit) => {
    if (!value.trim()) return value;
    const text = translated[index++];
    if (!text?.trim()) throw new Error("TRANSLATION_SEGMENT_MISMATCH");
    if (limit)
      return text
        .trim()
        .slice(0, limit)
        .replace(/[\uD800-\uDBFF]$/, "");
    return (
      (text.trimStart() === text ? (value.match(/^\s*/)?.[0] ?? "") : "") +
      text +
      (text.trimEnd() === text ? (value.match(/\s*$/)?.[0] ?? "") : "")
    );
  });
  if (index !== translated.length)
    throw new Error("TRANSLATION_SEGMENT_MISMATCH");
  return result;
}
