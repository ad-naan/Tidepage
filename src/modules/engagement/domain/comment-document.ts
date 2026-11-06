import { z } from "zod";
import {
  documentText,
  isEditorDocument,
  type EditorNode,
} from "@/shared/contracts/rich-text";
const commentNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
]);
/** Comments share the document format, with a smaller set of blocks and payload limits. */
export const commentDocumentSchema = z.custom<EditorNode>((value) => {
  if (!isEditorDocument(value) || JSON.stringify(value).length > 24000)
    return false;
  function allowed(node: EditorNode): boolean {
    return commentNodes.has(node.type) && (node.content ?? []).every(allowed);
  }
  const text = documentText(value).trim();
  return allowed(value) && text.length > 0 && text.length <= 2000;
});
