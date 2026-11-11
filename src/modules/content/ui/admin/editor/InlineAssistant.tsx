"use client";
import { useLayoutEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import type { WritingTarget } from "@/modules/ai/ui/WritingAssistant";
import {
  assistantWorkspaceKey,
  assistantWorkspacePosition,
} from "./AssistantWorkspace";
import styles from "./InlineAssistant.module.css";

export function InlineAssistant({
  editor,
  target,
  id,
  label,
  children,
}: {
  editor: Editor;
  target: WritingTarget;
  id: string;
  label: string;
  children: ReactNode;
}) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (editor.isDestroyed || !editor.state.doc.eq(target.doc)) return;
    const element = document.createElement("div");
    element.contentEditable = "false";
    element.className = styles.workspace;
    element.id = id;
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", label);
    editor.view.dispatch(
      editor.state.tr.setMeta(assistantWorkspaceKey, {
        pos: assistantWorkspacePosition(target.selection),
        element,
      }),
    );
    setMount(element);
    // Only reveal the composer on opening; streamed output must not move the document.
    const frame = requestAnimationFrame(() =>
      element.scrollIntoView({ block: "nearest", behavior: "instant" }),
    );
    return () => {
      cancelAnimationFrame(frame);
      if (!editor.isDestroyed)
        editor.view.dispatch(
          editor.state.tr.setMeta(assistantWorkspaceKey, null),
        );
    };
  }, [editor, target, id, label]);
  return mount ? createPortal(children, mount) : null;
}
