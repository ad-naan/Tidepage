import { createElement, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import {
  documentText,
  safeWebUrl,
  type EditorNode,
} from "@/modules/content/domain/editor-document";
import { documentChapters } from "@/modules/content/domain/document-presentation";
import { ArticleBlocks } from "@/modules/content/ui/articles/ArticleBlocks";
import { isUploadedAssetId } from "@/modules/media/domain/asset-path";
import styles from "./RichText.module.css";

function RenderNode({ node }: { node: EditorNode }) {
  const t = useTranslations("articleBlocks");
  const children = node.content?.map((child, index) => (
    <RenderNode key={index} node={child} />
  ));
  if (node.type === "text") {
    let content: ReactNode = node.text;
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
        case "code":
          content = <code>{content}</code>;
          break;
        case "link":
          if (safeWebUrl.safeParse(mark.attrs?.href).success)
            content = (
              <ExternalLink href={String(mark.attrs?.href)}>
                {content}
              </ExternalLink>
            );
          break;
      }
    }
    return content;
  }
  switch (node.type) {
    case "paragraph":
      return <p>{children}</p>;
    case "heading":
      return createElement(
        `h${Math.min(6, Math.max(2, Number(node.attrs?.level) || 2))}`,
        null,
        children,
        Number(node.attrs?.level) === 2 && (
          <HanddrawnMark className="chapter-mark" />
        ),
      );
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "bulletList":
    case "taskList":
      return <ul>{children}</ul>;
    case "orderedList":
      return <ol start={Number(node.attrs?.start) || 1}>{children}</ol>;
    case "listItem":
    case "taskItem":
      return (
        <li>
          {node.type === "taskItem" && (
            <span aria-hidden>{node.attrs?.checked ? "☑ " : "☐ "}</span>
          )}
          {children}
        </li>
      );
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "callout":
      return (
        <aside className={styles.callout}>
          {node.attrs?.title ? (
            <strong>{String(node.attrs.title)}</strong>
          ) : null}
          {children}
        </aside>
      );
    case "codeBlock":
      return (
        <ArticleBlocks
          blocks={[
            {
              type: "code",
              language: String(node.attrs?.language || "text"),
              code: documentText(node),
              caption: String(node.attrs?.caption || ""),
            },
          ]}
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
        <figure className={styles.image}>
          <img src={src} alt={String(node.attrs?.alt ?? "")} loading="lazy" />
          {node.attrs?.caption ? (
            <figcaption>{String(node.attrs.caption)}</figcaption>
          ) : null}
        </figure>
      );
    }
    case "referenceCard":
      return (
        <aside className={styles.callout}>
          <ExternalLink href={String(node.attrs?.url)}>
            {String(node.attrs?.title)}
          </ExternalLink>
          <p>{String(node.attrs?.description ?? "")}</p>
        </aside>
      );
    default:
      return <>{children}</>;
  }
}

export function RichText({
  document,
  chapters = false,
}: {
  document: EditorNode;
  chapters?: boolean;
}) {
  let index = 0;
  return (
    <div className={styles.rich}>
      {documentChapters(document).map((chapter, i) =>
        chapters && chapter.title ? (
          <section key={i} id={`section-${index++}`}>
            {chapter.nodes.map((node, j) => (
              <RenderNode key={j} node={node} />
            ))}
          </section>
        ) : (
          <div key={i}>
            {chapter.nodes.map((node, j) => (
              <RenderNode key={j} node={node} />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
