import { createElement, type ReactNode } from "react";
import { useMessages, useTranslations } from "next-intl";
import {
  Info,
  Lightbulb,
  TriangleAlert,
  Bookmark,
  Square,
  SquareCheck,
} from "lucide-react";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import {
  documentText,
  safeWebUrl,
  embedSchema,
  type EditorNode,
  type Embed,
} from "@/modules/content/domain/editor-document";
import { documentChapters } from "@/modules/content/domain/document-presentation";
import { CodeBlock } from "@/shared/ui/code/CodeBlock";
import { isUploadedAssetId } from "@/modules/media/domain/asset-path";
import { ReferenceCard } from "./ReferenceCard";
import { ReadingImage } from "./ReadingImage";
import { ReadingLink } from "./ReadingLink";
import styles from "./RichText.module.css";
import { getSticker } from "@/shared/config/stickers";
import { AuthorNameText } from "@/modules/identity/ui/AuthorSignature";

function RenderNode({
  node,
  references,
}: {
  node: EditorNode;
  references: Record<string, Embed>;
}) {
  const t = useTranslations("articleBlocks");
  const stickerLabels = useMessages().stickers.items as Record<string, string>;
  const children = node.content?.map((child, index) => (
    <RenderNode key={index} node={child} references={references} />
  ));
  if (node.type === "text") {
    let content: ReactNode = node.marks?.some(
      (mark) => mark.type === "code",
    ) ? (
      node.text
    ) : (
      <AuthorNameText text={node.text ?? ""} />
    );
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          content = <strong>{content}</strong>;
          break;
        case "italic":
          content = <em>{content}</em>;
          break;
        case "strike":
          content = <s>{content}</s>;
          break;
        case "underline":
          content = <u>{content}</u>;
          break;
        case "highlight":
          content = <mark>{content}</mark>;
          break;
        case "superscript":
          content = <sup>{content}</sup>;
          break;
        case "subscript":
          content = <sub>{content}</sub>;
          break;
        case "code":
          content = <code>{content}</code>;
          break;
        case "link":
          if (safeWebUrl.safeParse(mark.attrs?.href).success)
            content = (
              <ReadingLink
                href={String(mark.attrs?.href)}
                preview={references[String(mark.attrs?.href)]}
              >
                {content}
              </ReadingLink>
            );
          break;
      }
    }
    return content;
  }
  switch (node.type) {
    case "paragraph":
      return (
        <p
          className={
            node.content?.length &&
            node.content.every((child) => child.type === "sticker")
              ? styles.stickersOnly
              : undefined
          }
        >
          {children}
        </p>
      );
    case "sticker": {
      const sticker = getSticker(node.attrs?.id);
      return sticker ? (
        <img
          className={styles.sticker}
          src={sticker.src}
          alt={stickerLabels[sticker.key]}
          title={stickerLabels[sticker.key]}
          width={32}
          height={32}
          loading="lazy"
          draggable={false}
        />
      ) : null;
    }
    case "heading":
      return createElement(
        `h${Math.min(6, Math.max(2, Number(node.attrs?.level) || 2))}`,
        null,
        children,
      );
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "bulletList":
      return <ul>{children}</ul>;
    case "taskList":
      return <ul className={styles.tasks}>{children}</ul>;
    case "orderedList":
      return <ol start={Number(node.attrs?.start) || 1}>{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "taskItem":
      return (
        <li data-checked={Boolean(node.attrs?.checked)}>
          <span
            className={styles.check}
            role="img"
            aria-label={node.attrs?.checked ? t("completed") : t("incomplete")}
          >
            {node.attrs?.checked ? (
              <SquareCheck size={17} />
            ) : (
              <Square size={17} />
            )}
          </span>
          <div>{children}</div>
        </li>
      );
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "callout": {
      const tone = ["note", "tip", "warning", "important"].includes(
        String(node.attrs?.tone),
      )
        ? String(node.attrs?.tone)
        : "note";
      const Icon =
        tone === "tip"
          ? Lightbulb
          : tone === "warning"
            ? TriangleAlert
            : tone === "important"
              ? Bookmark
              : Info;
      return (
        <aside className={styles.callout} data-tone={tone}>
          <Icon size={18} className={styles.calloutIcon} aria-hidden="true" />
          <div>
            {node.attrs?.title ? (
              <strong>{String(node.attrs.title)}</strong>
            ) : null}
            {children}
          </div>
        </aside>
      );
    }
    case "details":
      return (
        <Disclosure
          className={styles.details}
          summary={String(node.attrs?.summary || t("details"))}
        >
          <div>{children}</div>
        </Disclosure>
      );
    case "codeBlock":
      return (
        <CodeBlock
          code={documentText(node)}
          language={String(node.attrs?.language || "text")}
          caption={String(node.attrs?.caption || "")}
        />
      );
    case "table":
      return (
        <div
          className={styles.table}
          tabIndex={0}
          role="region"
          aria-label={t("table")}
        >
          <table>
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr>{children}</tr>;
    case "tableCell":
      return (
        <td
          colSpan={Number(node.attrs?.colspan) || 1}
          rowSpan={Number(node.attrs?.rowspan) || 1}
        >
          {children}
        </td>
      );
    case "tableHeader":
      return (
        <th
          scope="col"
          colSpan={Number(node.attrs?.colspan) || 1}
          rowSpan={Number(node.attrs?.rowspan) || 1}
        >
          {children}
        </th>
      );
    case "assetImage": {
      const src = String(node.attrs?.assetId ?? "");
      if (!isUploadedAssetId(src)) return null;
      return (
        <ReadingImage
          src={src}
          alt={String(node.attrs?.alt ?? "")}
          caption={String(node.attrs?.caption || "")}
          width={Number(node.attrs?.width ?? 100)}
          align={String(node.attrs?.align || "center")}
        />
      );
    }
    case "referenceCard":
      return <ReferenceCard value={node.attrs as Embed} />;
    default:
      return <>{children}</>;
  }
}
export function RichText({
  document,
  chapters = false,
  compact = false,
}: {
  document: EditorNode;
  chapters?: boolean;
  compact?: boolean;
}) {
  let index = 0;
  const references: Record<string, Embed> = {};
  function collect(node: EditorNode) {
    if (node.type === "referenceCard") {
      const result = embedSchema.safeParse(node.attrs);
      if (result.success) references[result.data.url] = result.data;
    }
    node.content?.forEach(collect);
  }
  collect(document);
  return (
    <div className={`${styles.rich} ${compact ? styles.compact : ""}`}>
      {documentChapters(document).map((chapter, i) =>
        chapters && chapter.title ? (
          <section key={i} id={`section-${index++}`}>
            {chapter.nodes.map((node, j) => (
              <RenderNode key={j} node={node} references={references} />
            ))}
          </section>
        ) : (
          <div key={i}>
            {chapter.nodes.map((node, j) => (
              <RenderNode key={j} node={node} references={references} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
