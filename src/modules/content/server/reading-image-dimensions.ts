import "server-only";
import { getImageDimensions } from "@/modules/media/server";
import type { EditorNode } from "@/shared/contracts/rich-text";

export function getReadingImageDimensions(
  documents: (EditorNode | undefined)[],
  sources: string[] = [],
) {
  const images = [...sources];
  function visit(node: EditorNode) {
    const source = node.attrs?.assetId;
    if (node.type === "assetImage" && typeof source === "string")
      images.push(source);
    node.content?.forEach(visit);
  }
  documents.forEach((document) => document && visit(document));
  return getImageDimensions(images);
}
