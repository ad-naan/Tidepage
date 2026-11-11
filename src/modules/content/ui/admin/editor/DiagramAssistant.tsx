"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, SlidersHorizontal, Square, Workflow, X } from "lucide-react";
import { streamDiagram } from "@/modules/ai/ui/diagram-stream";
import type { MiniDiagram as Diagram } from "@/shared/contracts/diagram";
import { defaultLocale, isLocale, type Locale } from "@/shared/i18n/config";
import { MiniDiagram } from "@/shared/ui/drawing/MiniDiagram";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import styles from "./DiagramAssistant.module.css";

export function DiagramAssistant({
  context,
  contentLocale,
  onClose,
  onEdit,
  onInsert,
  initialInstruction,
}: {
  context: string;
  contentLocale?: Locale;
  onClose: () => void;
  onEdit: (value?: Diagram) => void;
  onInsert: (value: Diagram) => boolean;
  initialInstruction?: string;
}) {
  const t = useTranslations("diagrams");
  const ai = useTranslations("admin.ai");
  const uiLocale = useLocale();
  const locale =
    contentLocale ?? (isLocale(uiLocale) ? uiLocale : defaultLocale);
  const [prompt, setPrompt] = useState("");
  const [value, setValue] = useState<Diagram>();
  const [live, setLive] = useState<Diagram>();
  const [phase, setPhase] = useState<
    "idle" | "generating" | "done" | "stopped"
  >(initialInstruction ? "generating" : "idle");
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = phase === "generating";
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
    return () => {
      const task = request.current;
      request.current = null;
      task?.abort();
    };
  }, []);
  useEffect(() => {
    if (!initialInstruction) return;
    const timer = setTimeout(() => void generate(initialInstruction), 0);
    return () => clearTimeout(timer);
  }, [initialInstruction]);
  async function generate(instruction = prompt) {
    if (!instruction.trim() || request.current) return;
    const task = new AbortController();
    request.current = task;
    setPhase("generating");
    setError("");
    setLive(undefined);
    try {
      for await (const event of streamDiagram(
        {
          prompt: instruction,
          locale,
          context,
          ...(value ? { diagram: value } : {}),
        },
        task.signal,
      )) {
        if (request.current !== task) return;
        if (event.type === "progress") setLive(event.diagram);
        if (event.type === "done") {
          setValue(event.diagram);
          setLive(undefined);
          setPrompt("");
          setPhase("done");
        }
      }
    } catch {
      if (request.current === task) {
        setLive(undefined);
        setPhase(task.signal.aborted ? "stopped" : "idle");
        if (!task.signal.aborted) setError(t("generationFailed"));
      }
    } finally {
      if (request.current === task) request.current = null;
    }
  }
  const preview = live ?? value;
  return (
    <div
      className={styles.root}
      data-review={phase !== "idle" || !!value}
      data-busy={busy}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (busy) request.current?.abort();
          else onClose();
        }
      }}
    >
      <div className={styles.heading}>
        <strong>
          <Workflow size={15} />
          {t("inlineTitle")}
        </strong>
        <span className={styles.context}>
          {context.trim()
            ? ai("scopeSelection", { count: context.length })
            : ai("scopeCursor")}
        </span>
        {busy && (
          <Button
            size="sm"
            variant="quiet"
            className={styles.stop}
            onClick={() => request.current?.abort()}
          >
            <Square size={12} />
            {t("stop")}
          </Button>
        )}
        <IconButton aria-label={ai("closeWriting")} onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      {!preview && (
        <div className={styles.actions}>
          {(["flow", "compare", "relations"] as const).map((kind) => (
            <Button
              key={kind}
              size="sm"
              className={styles.quickAction}
              disabled={busy}
              onClick={() => {
                const instruction = t(`suggestions.${kind}.prompt`);
                setPrompt(instruction);
                void generate(instruction);
              }}
            >
              {t(`suggestions.${kind}.label`)}
            </Button>
          ))}
        </div>
      )}
      {phase !== "idle" && (
        <p className={styles.status} role="status">
          {live
            ? t("progress", {
                nodes: live.nodes.length,
                edges: live.edges.length,
              })
            : t(`phases.${phase}`)}
        </p>
      )}
      {preview && (
        <div className={styles.preview} data-custom-scroll={t("preview")}>
          <MiniDiagram value={preview} />
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {value && !busy && (
        <div className={styles.review}>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (onInsert(value)) onClose();
              else setError(t("documentChanged"));
            }}
          >
            {t("insert")}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => onEdit(value)}>
            <SlidersHorizontal size={14} />
            {t("adjust")}
          </Button>
          <Button size="sm" className={styles.discard} onClick={onClose}>
            {ai("discard")}
          </Button>
        </div>
      )}
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
      >
        <Textarea
          ref={input}
          appearance="bare"
          aria-label={t("prompt")}
          placeholder={t(value ? "refinePrompt" : "inlinePrompt")}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={2000}
          rows={1}
          disabled={busy}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              void generate();
            }
          }}
        />
        <div className={styles.footer}>
          <span className={styles.hint}>{t("sendHint")}</span>
          {busy ? (
            <Button
              variant="quiet"
              size="sm"
              onClick={() => request.current?.abort()}
            >
              <Square size={12} />
              {t("stop")}
            </Button>
          ) : (
            <IconButton
              type="submit"
              variant="primary"
              className={styles.send}
              aria-label={t("generate")}
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
