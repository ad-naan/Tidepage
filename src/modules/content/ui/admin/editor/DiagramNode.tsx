"use client";
import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { GripVertical, Pencil } from "lucide-react";
import {
  diagramSchema,
  type MiniDiagram as Diagram,
} from "@/shared/contracts/diagram";
import { MiniDiagram } from "@/shared/ui/drawing/MiniDiagram";
import { Button } from "@/shared/ui/button/Button";
import styles from "./DiagramNode.module.css";

function DiagramView({
  node,
  editor,
  extension,
  getPos,
  selected,
}: NodeViewProps) {
  const t = useTranslations("diagrams");
  const result = useMemo(
    () => diagramSchema.safeParse(node.attrs.diagram),
    [node.attrs.diagram],
  );
  if (!result.success) return null;
  return (
    <NodeViewWrapper
      contentEditable={false}
      className={styles.root}
      data-selected={selected}
    >
      {editor.isEditable && (
        <div className={styles.tools}>
          <span
            draggable="true"
            data-drag-handle
            className={styles.grip}
            title={t("dragBlock")}
            aria-label={t("dragBlock")}
          >
            <GripVertical size={14} />
          </span>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              const pos = getPos();
              if (typeof pos === "number")
                extension.options.onEdit(result.data, pos);
            }}
          >
            <Pencil size={13} />
            {t("edit")}
          </Button>
        </div>
      )}
      <div
        data-drag-handle={editor.isEditable ? "" : undefined}
        draggable={editor.isEditable}
      >
        <MiniDiagram value={result.data} />
      </div>
    </NodeViewWrapper>
  );
}
export const MiniDiagramNode = Node.create({
  name: "miniDiagram",
  group: "block",
  atom: true,
  draggable: true,
  addOptions() {
    return { onEdit: (_value: Diagram, _pos: number) => {} };
  },
  addAttributes() {
    return { diagram: { default: null, rendered: false } };
  },
  parseHTML() {
    return [
      {
        tag: "div[data-mini-diagram]",
        getAttrs: (element) => {
          try {
            const result = diagramSchema.safeParse(
              JSON.parse(element.getAttribute("data-mini-diagram") ?? ""),
            );
            return result.success ? { diagram: result.data } : false;
          } catch {
            return false;
          }
        },
      },
    ];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-mini-diagram": JSON.stringify(node.attrs.diagram) },
      node.attrs.diagram?.title ?? "",
    ];
  },
  renderText({ node }) {
    return node.attrs.diagram?.title ?? "";
  },
  addNodeView() {
    return ReactNodeViewRenderer(DiagramView);
  },
});
