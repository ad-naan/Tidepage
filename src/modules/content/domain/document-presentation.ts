import { documentText, type EditorNode } from "./editor-document";
import { getSticker } from "@/shared/config/stickers";

export function documentChapters(document: EditorNode) {
  const chapters: { title?: string; nodes: EditorNode[] }[] = [{ nodes: [] }];
  const levels = (document.content ?? [])
    .filter((node) => node.type === "heading")
    .map((node) => Number(node.attrs?.level) || 2);
  const chapterLevel = Math.min(...levels);
  for (const node of document.content ?? []) {
    if (node.type === "heading" && Number(node.attrs?.level) === chapterLevel)
      chapters.push({ title: documentText(node), nodes: [node] });
    else chapters.at(-1)!.nodes.push(node);
  }
  return chapters.filter((chapter) => chapter.nodes.length);
}

const escape = (text: string) => text.replace(/[\\`*_[\]<>|]/g, "\\$&");
/** The Markdown endpoint uses the same document as the reading page. */
export function documentMarkdown(node: EditorNode): string {
  const inside = () => (node.content ?? []).map(documentMarkdown).join("");
  if (node.type === "text") {
    let value = escape(node.text ?? "");
    for (const mark of node.marks ?? []) {
      if (mark.type === "code") {
        const fence = "`".repeat(
          Math.max(
            1,
            ...(node.text?.match(/`+/g) ?? []).map((part) => part.length + 1),
          ),
        );
        value = `${fence} ${node.text ?? ""} ${fence}`;
      } else if (mark.type === "bold") value = `**${value}**`;
      else if (mark.type === "italic") value = `*${value}*`;
      else if (mark.type === "strike") value = `~~${value}~~`;
      else if (
        ["underline", "highlight", "superscript", "subscript"].includes(
          mark.type,
        )
      ) {
        const tag = {
          underline: "u",
          highlight: "mark",
          superscript: "sup",
          subscript: "sub",
        }[mark.type];
        value = `<${tag}>${value}</${tag}>`;
      } else if (mark.type === "link")
        value = `[${value}](${String(mark.attrs?.href).replaceAll("(", "%28").replaceAll(")", "%29")})`;
    }
    return value;
  }
  switch (node.type) {
    case "sticker": {
      const sticker = getSticker(node.attrs?.id);
      return sticker ? `![${sticker.name}](${sticker.src})` : "";
    }
    case "doc":
      return inside().trim();
    case "paragraph":
      return `${inside()}\n\n`;
    case "heading":
      return `${"#".repeat(Math.max(2, Math.min(6, Number(node.attrs?.level) || 2)))} ${inside()}\n\n`;
    case "hardBreak":
      return "  \n";
    case "horizontalRule":
      return "\n---\n\n";
    case "codeBlock": {
      const code = documentText(node);
      const fence = "`".repeat(
        Math.max(
          3,
          ...(code.match(/`+/g) ?? []).map((part) => part.length + 1),
        ),
      );
      return `${fence}${String(node.attrs?.language ?? "").replace(/[^\w+-]/g, "")}\n${code}\n${fence}\n\n`;
    }
    case "blockquote":
      return (
        inside()
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );
    case "callout":
      return `> **${escape(String(node.attrs?.title || node.attrs?.tone || ""))}**\n>\n${inside()
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`;
    case "details":
      return `<details>\n<summary>${String(node.attrs?.summary ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</summary>\n\n${inside()}\n</details>\n\n`;
    case "orderedList":
    case "bulletList":
    case "taskList":
      return (
        (node.content ?? [])
          .map((item, index) => {
            const prefix =
              node.type === "orderedList"
                ? `${(Number(node.attrs?.start) || 1) + index}. `
                : node.type === "taskList"
                  ? `- [${item.attrs?.checked ? "x" : " "}] `
                  : "- ";
            return (
              prefix +
              documentMarkdown(item)
                .trim()
                .replaceAll("\n", "\n" + " ".repeat(prefix.length))
            );
          })
          .join("\n") + "\n\n"
      );
    case "assetImage":
      return `![${escape(String(node.attrs?.alt ?? ""))}](${String(node.attrs?.assetId ?? "")})\n\n`;
    case "table":
      return (
        (node.content ?? [])
          .map((row, index) => {
            const cells = (row.content ?? []).map((cell) =>
              documentMarkdown(cell).trim().replaceAll("\n", "<br>"),
            );
            return (
              `| ${cells.join(" | ")} |` +
              (index === 0 ? `\n| ${cells.map(() => "---").join(" | ")} |` : "")
            );
          })
          .join("\n") + "\n\n"
      );
    case "referenceCard":
      return `[${escape(String(node.attrs?.title ?? ""))}](${String(node.attrs?.url ?? "")})\n\n${escape(String(node.attrs?.description ?? ""))}\n\n`;
    default:
      return inside();
  }
}
