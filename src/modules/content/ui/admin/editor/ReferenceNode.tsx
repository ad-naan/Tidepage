"use client";
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useTranslations } from "next-intl";
import { GripVertical } from "lucide-react";
import {
  embedSchema,
  type Embed,
} from "@/modules/content/domain/editor-document";
import { Button } from "@/shared/ui/button/Button";
import { Input } from "@/shared/ui/field/Input";
import { Select } from "@/shared/ui/select/Select";
import { ReferenceCard as ReferencePreview } from "../../rich-text/ReferenceCard";
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
      <div>
        <ReferencePreview value={attrs} compact />
        {editor.isEditable && (
          <Button
            size="sm"
            variant="quiet"
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
          <Select
            label={t("calloutTone")}
            value={String(node.attrs.tone)}
            options={(["note", "tip", "warning", "important"] as const).map(
              (value) => ({ value, label: t(`tones.${value}`) }),
            )}
            onValueChange={(tone) => updateAttributes({ tone })}
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
