"use client";
import { useState } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { ListTree, SquareStack } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import {
  blockActions,
  currentBlock,
  editCurrentBlock,
} from "./document-blocks";
import styles from "./editor.module.css";

export function DocumentTools({ editor }: { editor: Editor }) {
  const t = useTranslations("admin.editor.documentTools");
  const [open, setOpen] = useState<"blocks" | "outline" | null>(null);
  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      const block = currentBlock(editor.state);
      return {
        selected: !!block?.node,
        up: !!block && block.index > 0,
        down: !!block && block.index < editor.state.doc.childCount - 1,
      };
    },
  });
  const headings: { pos: number; level: number; text: string }[] = [];
  if (open === "outline")
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.textContent.trim())
        headings.push({ pos, level: node.attrs.level, text: node.textContent });
    });
  return (
    <div className={styles.toolGroup}>
      <IconButton
        aria-label={t("blocks")}
        title={t("blocks")}
        disabled={!block.selected}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setOpen("blocks")}
      >
        <SquareStack size={15} />
      </IconButton>
      <IconButton
        aria-label={t("outline")}
        title={t("outline")}
        onClick={() => setOpen("outline")}
      >
        <ListTree size={15} />
      </IconButton>
      {open && (
        <Dialog title={t(open)} onClose={() => setOpen(null)} size="compact">
          {open === "blocks" ? (
            <div className={styles.commandList}>
              {blockActions.map((action) => (
                <Button
                  key={action}
                  className={styles.command}
                  disabled={
                    (action === "up" && !block.up) ||
                    (action === "down" && !block.down)
                  }
                  onClick={() => {
                    const transaction = editCurrentBlock(editor.state, action);
                    if (transaction) editor.view.dispatch(transaction);
                    setOpen(null);
                    editor.commands.focus();
                  }}
                >
                  {t(action)}
                </Button>
              ))}
            </div>
          ) : headings.length ? (
            <div className={styles.commandList}>
              {headings.map(({ pos, level, text }) => (
                <Button
                  key={pos}
                  className={styles.command}
                  style={{
                    paddingInlineStart: `${Math.min(6, level) * 0.75}rem`,
                  }}
                  onClick={() => {
                    setOpen(null);
                    editor
                      .chain()
                      .focus(pos + 1)
                      .scrollIntoView()
                      .run();
                  }}
                >
                  {text}
                </Button>
              ))}
            </div>
          ) : (
            <p>{t("noHeadings")}</p>
          )}
        </Dialog>
      )}
    </div>
  );
}
