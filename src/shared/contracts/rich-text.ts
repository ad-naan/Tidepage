import { z } from "zod";
import { getSticker } from "@/shared/config/stickers";
export const safeWebUrl = z.url({ protocol: /^https?$/ }).refine((value) => {
  try {
    const parsed = new URL(value);
    return !parsed.username && !parsed.password;
  } catch {
    return false;
  }
});
export const embedSchema = z.object({
  kind: z.enum(["web", "movie", "music"]),
  title: z.string().trim().min(1).max(200),
  url: safeWebUrl,
  description: z.string().max(2000).default(""),
  creator: z.string().max(200).default(""),
  year: z
    .string()
    .regex(/^$|^\d{4}$/)
    .default(""),
  artworkAssetId: z.string().default(""),
  originalTitle: z.string().max(200).optional(),
  siteName: z.string().max(80).optional(),
  artworkUrl: z
    .string()
    .refine(
      (value) =>
        !value ||
        /^\/(?!\/)[^\\]*$/.test(value) ||
        safeWebUrl.safeParse(value).success,
    )
    .optional(),
  artworkAlt: z.string().max(300).optional(),
  album: z.string().max(200).optional(),
});
export type Embed = z.infer<typeof embedSchema>;
export type EditorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: EditorNode[];
};
const supportedNodes = new Set([
  "doc",
  "paragraph",
  "text",
  "sticker",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "taskList",
  "taskItem",
  "blockquote",
  "callout",
  "details",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "referenceCard",
  "assetImage",
]);
const supportedMarks = new Set([
  "bold",
  "italic",
  "strike",
  "code",
  "link",
  "underline",
  "highlight",
  "superscript",
  "subscript",
]);
/** Bound depth/size before walking; reject unsupported nodes rather than dropping content. */
export function isEditorDocument(value: unknown): value is EditorNode {
  let count = 0;
  function valid(node: unknown, depth: number): boolean {
    if (++count > 20000 || depth > 32 || !node || typeof node !== "object")
      return false;
    const n = node as EditorNode;
    if (!supportedNodes.has(n.type)) return false;
    if (n.type === "sticker" && !getSticker(n.attrs?.id)) return false;
    if (
      n.text !== undefined &&
      (typeof n.text !== "string" || n.text.length > 200000)
    )
      return false;
    if (n.type === "referenceCard" && !embedSchema.safeParse(n.attrs).success)
      return false;
    if (
      n.type === "details" &&
      (typeof n.attrs?.summary !== "string" || n.attrs.summary.length > 300)
    )
      return false;
    if (
      n.type === "assetImage" &&
      (typeof n.attrs?.assetId !== "string" || !n.attrs.assetId)
    )
      return false;
    if (
      n.marks &&
      (!Array.isArray(n.marks) ||
        n.marks.some(
          (mark) =>
            !supportedMarks.has(mark.type) ||
            (mark.type === "link" &&
              !safeWebUrl.safeParse(mark.attrs?.href).success),
        ))
    )
      return false;
    return (
      !n.content ||
      (Array.isArray(n.content) &&
        n.content.every((child) => valid(child, depth + 1)))
    );
  }
  try {
    return (
      JSON.stringify(value).length <= 2_000_000 &&
      (value as EditorNode)?.type === "doc" &&
      valid(value, 0)
    );
  } catch {
    return false;
  }
}
export const editorDocumentSchema = z.custom<EditorNode>(isEditorDocument);
export const emptyDocument = (): EditorNode => ({
  type: "doc",
  content: [{ type: "paragraph" }],
});
export function documentText(node: EditorNode): string {
  if (node.type === "sticker")
    return `[${getSticker(node.attrs?.id)?.name ?? ""}]`;
  return (
    node.text ??
    node.content
      ?.map(documentText)
      .join(node.type === "paragraph" || node.type === "heading" ? "" : "\n") ??
    ""
  );
}

export function plainTextDocument(text: string): EditorNode {
  return {
    type: "doc",
    content: text.split(/\r?\n/).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}
