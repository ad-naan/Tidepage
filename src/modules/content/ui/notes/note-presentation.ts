import type { Note } from "@/modules/content/domain/models";
import type { EditorNode } from "@/modules/content/domain/editor-document";
import { isUploadedAssetId } from "@/modules/media/domain/asset-path";

export type NoteImage = { src: string; alt: string; caption: string };

/** Keep the document's image order while moving its photos into the reader. */
export function notePresentation(note: Note) {
  const images: NoteImage[] = [];
  function visit(node: EditorNode): EditorNode | null {
    if (node.type === "assetImage") {
      const src = String(node.attrs?.assetId ?? "");
      if (!isUploadedAssetId(src)) return null;
      images.push({
        src,
        alt: String(node.attrs?.alt ?? ""),
        caption: String(node.attrs?.caption ?? ""),
      });
      return null;
    }
    if (!node.content) return node;
    const content = node.content.flatMap((child) => {
      const next = visit(child);
      return next ? [next] : [];
    });
    if (node.content.length && !content.length && node.type !== "doc")
      return null;
    return { ...node, content };
  }
  const body = note.body ? (visit(note.body) ?? undefined) : undefined;
  return { images, body };
}
