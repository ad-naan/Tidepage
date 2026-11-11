"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  Fragment,
  Slice,
  type Node as ProseMirrorNode,
} from "@tiptap/pm/model";
import { Selection, TextSelection } from "@tiptap/pm/state";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Sparkles, Square, X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { useStreamText } from "./use-stream-text";
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
  const { text, append, flush, reset } = useStreamText();
  const [streaming, setStreaming] = useState(false);
  const [follow, setFollow] = useState(true);
  const output = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "stopped" | "error"
  >("idle");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const { doc, selection } = target;
  const { from, to, $from, $to } = selection;
  const { selectedText, sameBlock, canReplace } = useMemo(() => {
    const selectedText = doc.textBetween(from, to, "\n");
    let plainTextRange = true;
    if (selectedText.length <= articleContextLimit)
      doc.slice(from, to).content.descendants((node) => {
        if (
          !node.isText &&
          !["paragraph", "hardBreak"].includes(node.type.name)
        )
          plainTextRange = false;
        return plainTextRange;
      });
    return {
      selectedText,
      sameBlock: $from.sameParent($to),
      canReplace:
        selection instanceof TextSelection &&
        !$from.parent.type.spec.code &&
        !!selectedText.trim() &&
        selectedText.length <= articleContextLimit &&
        plainTextRange,
    };
  }, [doc, selection, from, to, $from, $to]);

  useLayoutEffect(() => {
    if (follow && output.current)
      output.current.scrollTop = output.current.scrollHeight;
  }, [text, follow]);

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
    const draft = text;
    reset();
    setStreaming(false);
    setFollow(true);
    setError("");
    setStatus("running");
    try {
      for await (const event of agent.stream(
        {
          prompt: instruction,
          ...(draft.trim()
            ? { draft: draft.slice(0, articleContextLimit) }
            : {}),
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
        if (event.type === "delta") {
          append(event.text);
          setStreaming(true);
        } else {
          flush();
          setStatus("done");
        }
      }
    } catch {
      if (controller.current === task)
        setStatus(task.signal.aborted ? "stopped" : "error");
    } finally {
      if (controller.current === task) {
        flush();
        controller.current = null;
      }
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
      $to.parentOffset > 0 &&
      /[\p{Script=Latin}\d.!?]$/u.test(
        $to.parent.textBetween(0, $to.parentOffset, "\n"),
      ) &&
      /^[\p{Script=Latin}\d]/u.test(value)
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
      data-custom-scroll={t("title")}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (status === "running") controller.current?.abort();
          else onClose();
        }
      }}
    >
      <div className={styles.heading}>
        <strong>
          <Sparkles size={15} />
          {t("title")}
        </strong>
        <IconButton aria-label={t("closeWriting")} onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className={styles.context}>
        {selectedText.trim() ? (
          <Disclosure
            summary={t("scopeSelection", { count: selectedText.length })}
          >
            <p className={styles.selection}>{selectedText.slice(0, 1000)}</p>
          </Disclosure>
        ) : (
          <span>{t("scopeCursor")}</span>
        )}
      </div>
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
      {status !== "idle" && (
        <div className={styles.progress} role="status">
          <span className={status === "running" ? styles.pulse : undefined} />
          {status === "running"
            ? t(streaming ? "streaming" : "requesting")
            : t(`status.${status}`)}
          {!!text && (
            <span className={styles.count}>
              {t("outputCount", { count: text.length })}
            </span>
          )}
        </div>
      )}
      {!!text && (
        <div
          ref={output}
          className={styles.result}
          data-custom-scroll={t("resultRegion")}
          role="region"
          aria-label={t("resultRegion")}
          tabIndex={0}
          aria-busy={status === "running"}
          onScroll={(event) => {
            const node = event.currentTarget;
            setFollow(
              node.scrollHeight - node.scrollTop - node.clientHeight < 32,
            );
          }}
        >
          <div>{text}</div>
        </div>
      )}
      {!!text && !follow && (
        <Button size="sm" variant="quiet" onClick={() => setFollow(true)}>
          <ArrowDown size={14} />
          {t("followOutput")}
        </Button>
      )}
      {(error || status === "error") && (
        <p className={styles.error} role="alert">
          {error || t("failed")}
        </p>
      )}
      {!!text.trim() && status !== "running" && (
        <div className={styles.review}>
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
      <form
        className={styles.composer}
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
          disabled={status === "running"}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void start(prompt);
            }
          }}
        />
        <div className={styles.composerFooter}>
          <span>{t(text ? "refineHint" : "sendHint")}</span>
          {status === "running" ? (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => controller.current?.abort()}
            >
              <Square size={12} />
              {t("stop")}
            </Button>
          ) : (
            <IconButton
              type="submit"
              aria-label={t("start")}
              disabled={!prompt.trim()}
            >
              <ArrowUp size={16} />
            </IconButton>
          )}
        </div>
      </form>
    </div>
  );
}
