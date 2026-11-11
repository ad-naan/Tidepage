"use client";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { IconButton } from "@/shared/ui/button/Button";
import { editBlockAt } from "./document-blocks";
import styles from "./BlockMoveControls.module.css";

/** A dedicated drag target and a keyboard/touch alternative for atomic blocks. */
export function BlockMoveControls({
  editor,
  getPos,
  label,
}: {
  editor: Editor;
  getPos: () => number | undefined;
  label: string;
}) {
  const t = useTranslations("admin.editor.documentTools");
  const available = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const pos = getPos();
      const block =
        typeof pos === "number" ? current.state.doc.childAfter(pos) : null;
      const topLevel = !!block?.node && block.offset === pos;
      return {
        up: topLevel && block.index > 0,
        down: topLevel && block.index < current.state.doc.childCount - 1,
      };
    },
  });
  function move(direction: "up" | "down") {
    const pos = getPos();
    if (typeof pos !== "number" || !editor.isEditable) return;
    const tr = editBlockAt(editor.state, pos, direction);
    if (tr) {
      editor.view.dispatch(tr);
      editor.view.focus();
    }
  }
  return (
    <div className={styles.root}>
      <span
        className={styles.grip}
        draggable="true"
        data-drag-handle
        title={label}
        aria-label={label}
      >
        <GripVertical size={16} />
      </span>
      {(["up", "down"] as const).map((direction) => (
        <IconButton
          key={direction}
          aria-label={t(direction)}
          title={t(direction)}
          disabled={!available[direction]}
          pressEffect={false}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => move(direction)}
        >
          {direction === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        </IconButton>
      ))}
    </div>
  );
}
