"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  NodeViewContent,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/ui/field/Input";
import styles from "./editor.module.css";

export {
  HighlightMark,
  SuperscriptMark,
  SubscriptMark,
} from "../../rich-text/RichTextMarks";
function DetailsView({ node, editor, updateAttributes }: NodeViewProps) {
  const t = useTranslations("admin.editor");
  return (
    <NodeViewWrapper className={styles.detailsBlock}>
      {editor.isEditable ? (
        <div contentEditable={false}>
          <Input
            aria-label={t("detailsTitle")}
            value={String(node.attrs.summary)}
            onChange={(e) => updateAttributes({ summary: e.target.value })}
          />
        </div>
      ) : (
        <strong>{String(node.attrs.summary)}</strong>
      )}
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
export const DetailsNode = Node.create({
  name: "details",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return { summary: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-details]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-details": "" }), 0];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DetailsView);
  },
});
