"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import { createPreviewWritingAgent } from "./writing-agent";
import styles from "./WritingPanel.module.css";
export function WritingPanel({
  editor,
  active = true,
  contentLocale,
}: {
  editor: Editor;
  active?: boolean;
  contentLocale?: string;
}) {
  const t = useTranslations("admin.ai");
  const uiLocale = useLocale();
  const locale = contentLocale ?? uiLocale;
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "running" | "done" | "stopped" | "error"
  >("idle");
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const target = useRef<{
    from: number;
    to: number;
    doc: ProseMirrorNode;
  } | null>(null);
  const taskId = useRef(0);
  useEffect(
    () => () => {
      taskId.current++;
      controller.current?.abort();
    },
    [],
  );
  const headingId = useId();
  useEffect(() => {
    if (!active) controller.current?.abort();
  }, [active]);
  async function start() {
    const requestId = ++taskId.current;
    controller.current?.abort();
    const task = new AbortController();
    controller.current = task;
    const { from, to } = editor.state.selection;
    target.current = { from, to, doc: editor.state.doc };
    setText("");
    setError("");
    setStatus("running");
    const agent = createPreviewWritingAgent(t("sample"));
    try {
      for await (const event of agent.stream(
        {
          prompt,
          locale,
          selection: editor.state.doc.textBetween(from, to, "\n"),
          context: editor.getText().slice(-12000),
        },
        task.signal,
      )) {
        if (taskId.current !== requestId) return;
        if (event.type === "delta") setText((current) => current + event.text);
        else setStatus("done");
      }
    } catch {
      if (taskId.current === requestId)
        setStatus(task.signal.aborted ? "stopped" : "error");
    }
  }
  function apply(replace: boolean) {
    const selection = target.current;
    if (!selection || !editor.state.doc.eq(selection.doc)) {
      setError(t("conflict"));
      return;
    }
    const paragraphs = text.split(/\n\n+/).map((value) => ({
      type: "paragraph",
      content: value ? [{ type: "text", text: value }] : [],
    }));
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from: replace ? selection.from : selection.to, to: selection.to },
        paragraphs,
      )
      .run();
    setText("");
    setStatus("idle");
    target.current = null;
  }
  return (
    <section className={styles.agent} aria-labelledby={headingId}>
      <h2 id={headingId}>{t("title")}</h2>
      <small>{t("preview")}</small>
      <Textarea
        aria-label={t("prompt")}
        placeholder={t("prompt")}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
      />
      <div>
        <Button
          variant="quiet"
          disabled={!prompt.trim() || status === "running"}
          onClick={start}
        >
          {t("start")}
        </Button>
        {status === "running" && (
          <Button onClick={() => controller.current?.abort()}>
            {t("stop")}
          </Button>
        )}
      </div>
      {!!text && (
        <div className={styles.agentResult} aria-busy={status === "running"}>
          {text}
        </div>
      )}
      <p role="status">{t(`status.${status}`)}</p>
      {(error || status === "error") && (
        <p role="alert">{error || t("failed")}</p>
      )}
      {!!text && status !== "running" && (
        <div>
          <Button variant="quiet" onClick={() => apply(false)}>
            {t("insert")}
          </Button>
          <Button
            disabled={target.current?.from === target.current?.to}
            onClick={() => apply(true)}
          >
            {t("replace")}
          </Button>
          <Button
            onClick={() => {
              setText("");
              setStatus("idle");
            }}
          >
            {t("discard")}
          </Button>
        </div>
      )}
    </section>
  );
}
