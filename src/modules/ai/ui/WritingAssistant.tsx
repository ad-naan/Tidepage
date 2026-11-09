"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  Fragment,
  Slice,
  type Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { useLocale, useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import {
  articleContextLimit,
  type WritingAgent,
} from "@/modules/ai/domain/writing";
import type { Locale } from "@/shared/i18n/config";
import styles from "./WritingAssistant.module.css";

export type WritingTarget = { doc: ProseMirrorNode; selection: Selection };

export function WritingAssistant({
  editor,
  target,
  active,
  contentLocale,
  agent,
  onClose,
}: {
  editor: Editor;
  target: WritingTarget;
  active: boolean;
  contentLocale?: Locale;
  agent: WritingAgent;
  onClose: () => void;
}) {
  const t = useTranslations("admin.ai");
  const uiLocale = useLocale();
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "stopped" | "error"
  >("idle");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { doc, selection } = target;
  const { from, to, $from, $to } = selection;
  const selectedText = doc.textBetween(from, to, "\n");
  const sameBlock = $from.sameParent($to);
  let plainTextRange = true;
  if (selectedText.length <= articleContextLimit)
    doc.slice(from, to).content.descendants((node) => {
      if (!node.isText && !["paragraph", "hardBreak"].includes(node.type.name))
        plainTextRange = false;
      return plainTextRange;
    });
  const canReplace =
    selection instanceof TextSelection &&
    !$from.parent.type.spec.code &&
    !!selectedText.trim() &&
    selectedText.length <= articleContextLimit &&
    plainTextRange;

  useEffect(() => {
    if (!active) return;
    input.current?.focus({ preventScroll: true });
    return () => {
      const task = controller.current;
      controller.current = null;
      task?.abort();
    };
  }, [active]);

  async function start(instruction: string) {
    if (controller.current || !instruction.trim()) return;
    const task = new AbortController();
    controller.current = task;
    setText("");
    setError("");
    setStatus("running");
    try {
      for await (const event of agent.stream(
        {
          prompt: instruction,
          locale: contentLocale ?? uiLocale,
          selection: selectedText.slice(0, articleContextLimit),
          context: doc
            .textBetween(
              Math.max(0, from - articleContextLimit / 2),
              Math.min(doc.content.size, to + articleContextLimit / 2),
              "\n",
            )
            .slice(0, articleContextLimit),
        },
        task.signal,
      )) {
        if (controller.current !== task) return;
        if (event.type === "delta") setText((current) => current + event.text);
        else setStatus("done");
      }
    } catch {
      if (controller.current === task)
        setStatus(task.signal.aborted ? "stopped" : "error");
    } finally {
      if (controller.current === task) controller.current = null;
    }
  }

  function apply(replace: boolean) {
    let value = text.trim();
    if (!value || (replace && !canReplace)) return;
    if (!editor.isEditable || !editor.state.doc.eq(doc)) {
      setError(t("conflict"));
      return;
    }
    const start = replace ? from : to;
    if (
      !replace &&
      !$to.parent.type.spec.code &&
      (contentLocale ?? uiLocale) === "en" &&
      $to.parentOffset > 0 &&
      /[\w.!?]$/.test($to.parent.textBetween(0, $to.parentOffset, "\n")) &&
      /^\w/.test(value)
    )
      value = ` ${value}`;
    const lines = value.split(/\r?\n/);
    if (!$to.parent.isTextblock) {
      if (
        !editor.commands.insertContentAt(
          to,
          lines.map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          })),
        )
      ) {
        setError(t("conflict"));
        return;
      }
      onClose();
      return;
    }
    const { schema, tr } = editor.state;
    if (replace && !sameBlock) {
      const paragraphs = lines.map((line) =>
        schema.nodes.paragraph.create(null, line ? schema.text(line) : null),
      );
      tr.replaceRange(
        from,
        to,
        new Slice(Fragment.fromArray(paragraphs), 1, 1),
      );
    } else {
      const marks = replace ? ($from.marksAcross($to) ?? []) : $to.marks();
      const content = $to.parent.type.spec.code
        ? [schema.text(value)]
        : lines.flatMap((line, index) => [
            ...(index ? [schema.nodes.hardBreak.create()] : []),
            ...(line ? [schema.text(line, marks)] : []),
          ]);
      tr.replaceWith(start, to, content);
    }
    if (!tr.docChanged) return;
    tr.setSelection(Selection.near(tr.doc.resolve(tr.mapping.map(to)), -1));
    editor.view.dispatch(tr.scrollIntoView());
    onClose();
  }

  return (
    <div
      className={styles.assistant}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.heading}>
        <strong>{t("title")}</strong>
        <IconButton aria-label={t("closeWriting")} onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      {selectedText.trim() && (
        <p className={styles.selection}>{selectedText.slice(0, 240)}</p>
      )}
      <div className={styles.actions}>
        {(selectedText.trim()
          ? (["polish", "shorten", "continue"] as const)
          : (["continue"] as const)
        ).map((action) => (
          <Button
            key={action}
            variant="quiet"
            size="sm"
            disabled={status === "running"}
            onClick={() => void start(t(`instructions.${action}`))}
          >
            {t(`actions.${action}`)}
          </Button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void start(prompt);
        }}
      >
        <Textarea
          ref={input}
          aria-label={t("prompt")}
          placeholder={t("prompt")}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          maxLength={2000}
        />
        <div className={styles.actions}>
          <Button
            type="submit"
            size="sm"
            disabled={!prompt.trim() || status === "running"}
          >
            {t("start")}
          </Button>
          {status === "running" && (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => controller.current?.abort()}
            >
              {t("stop")}
            </Button>
          )}
        </div>
      </form>
      {status !== "idle" && (
        <p className={styles.status} role="status">
          {t(`status.${status}`)}
        </p>
      )}
      {(error || status === "error") && (
        <p role="alert">{error || t("failed")}</p>
      )}
      {!!text && (
        <div className={styles.result} aria-busy={status === "running"}>
          {text}
        </div>
      )}
      {!!text.trim() && status !== "running" && (
        <div className={styles.actions}>
          {canReplace && (
            <Button size="sm" variant="primary" onClick={() => apply(true)}>
              {t("replace")}
            </Button>
          )}
          <Button size="sm" variant="quiet" onClick={() => apply(false)}>
            {t(selection.empty ? "insertAtCursor" : "insert")}
          </Button>
        </div>
      )}
    </div>
  );
}
