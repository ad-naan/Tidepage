"use client";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useTranslations } from "next-intl";
import { Film, Music2, Globe2, GripVertical } from "lucide-react";
import {
  embedSchema,
  type Embed,
} from "@/modules/content/domain/editor-document";
import { AssetImage } from "@/modules/media/ui/admin/AssetImage";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { ImageNodeView } from "./ImageNodeView";
import styles from "./editor.module.css";
function ReferenceView({
  node,
  editor,
  extension,
  getPos,
  selected,
}: NodeViewProps) {
  const t = useTranslations("admin.editor");
  const attrs = node.attrs as Embed;
  const Icon =
    attrs.kind === "movie" ? Film : attrs.kind === "music" ? Music2 : Globe2;
  return (
    <NodeViewWrapper
      className={`${styles.reference} ${selected ? styles.selected : ""}`}
      contentEditable={false}
    >
      {editor.isEditable && (
        <span data-drag-handle draggable="true" className={styles.grip}>
          <GripVertical size={14} />
        </span>
      )}
      <span className={styles.referenceIcon}>
        {attrs.artworkAssetId ? (
          <AssetImage id={attrs.artworkAssetId} alt={attrs.artworkAlt ?? ""} />
        ) : attrs.artworkUrl ? (
          <img
            src={attrs.artworkUrl}
            alt={attrs.artworkAlt ?? ""}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Icon size={24} />
        )}
      </span>
      <div>
        <small>
          {t(`blocks.${attrs.kind}`)} · {attrs.siteName || attrs.creator}{" "}
          {attrs.year}
        </small>
        <ExternalLink href={attrs.url}>{attrs.title} ↗</ExternalLink>
        {attrs.originalTitle && <small>{attrs.originalTitle}</small>}
        {attrs.album && <small>{attrs.album}</small>}
        <p>{attrs.description}</p>
        {editor.isEditable && (
          <Button
            size="sm"
            onClick={() => {
              const pos = getPos();
              if (typeof pos === "number") extension.options.onEdit(attrs, pos);
            }}
          >
            {t("editBlock")}
          </Button>
        )}
      </div>
    </NodeViewWrapper>
  );
}
export const ReferenceCard = Node.create({
  name: "referenceCard",
  group: "block",
  atom: true,
  draggable: true,
  addOptions() {
    return { onEdit: (_attrs: Embed, _pos: number) => {} };
  },
  addAttributes() {
    return Object.fromEntries(
      [
        "kind",
        "title",
        "url",
        "description",
        "creator",
        "year",
        "artworkAssetId",
        "originalTitle",
        "siteName",
        "artworkUrl",
        "artworkAlt",
        "album",
      ].map((key) => [key, { default: "" }]),
    );
  },
  parseHTML() {
    return [
      {
        tag: "div[data-reference-card]",
        getAttrs: (element) => {
          const data = Object.fromEntries(
            [
              "kind",
              "title",
              "url",
              "description",
              "creator",
              "year",
              "artworkAssetId",
              "originalTitle",
              "siteName",
              "artworkUrl",
              "artworkAlt",
              "album",
            ].map((key) => [key, element.getAttribute(key) ?? ""]),
          );
          const value = embedSchema.safeParse(data);
          return value.success ? value.data : false;
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-reference-card": "" }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ReferenceView);
  },
});
export const AssetImageNode = Node.create({
  name: "assetImage",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      assetId: { default: "" },
      alt: { default: "" },
      width: { default: 100 },
      align: { default: "center" },
      caption: { default: "" },
      originalAssetId: { default: "" },
      uploading: { default: false },
      uploadKey: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-asset-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-asset-id": HTMLAttributes.assetId,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
function CalloutView({ node, editor, updateAttributes }: NodeViewProps) {
  const t = useTranslations("admin.editor");
  return (
    <NodeViewWrapper className={styles.callout}>
      {editor.isEditable ? (
        <div contentEditable={false}>
          <Input
            aria-label={t("calloutTitle")}
            value={String(node.attrs.title)}
            onChange={(e) => updateAttributes({ title: e.target.value })}
          />
        </div>
      ) : (
        <strong>{String(node.attrs.title)}</strong>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
export const CalloutNode = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { title: { default: "" }, tone: { default: "note" } };
  },
  parseHTML() {
    return [{ tag: "aside[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "aside",
      mergeAttributes(HTMLAttributes, { "data-callout": "" }),
      0,
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});
