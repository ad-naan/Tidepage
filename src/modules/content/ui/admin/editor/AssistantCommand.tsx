"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, Workflow, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Textarea } from "@/shared/ui/field/Textarea";
import styles from "./AssistantCommand.module.css";

export function AssistantCommand({
  mode,
  onSubmit,
  onClose,
}: {
  mode: "write" | "diagram";
  onSubmit: (instruction: string) => void;
  onClose: () => void;
}) {
  const ai = useTranslations("admin.ai");
  const diagram = useTranslations("diagrams");
  const [prompt, setPrompt] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  const submit = () => {
    if (prompt.trim()) onSubmit(prompt.trim());
  };
  return (
    <form
      className={styles.command}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.inputRow}>
        <span className={styles.icon}>
          {mode === "write" ? <Sparkles size={16} /> : <Workflow size={16} />}
        </span>
        <Textarea
          ref={input}
          appearance="bare"
          rows={1}
          value={prompt}
          maxLength={2000}
          aria-label={mode === "write" ? ai("prompt") : diagram("prompt")}
          placeholder={
            mode === "write" ? ai("inlinePrompt") : diagram("inlinePrompt")
          }
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <IconButton
          type="submit"
          variant="primary"
          aria-label={ai("start")}
          disabled={!prompt.trim()}
        >
          <ArrowUp size={15} />
        </IconButton>
        <IconButton aria-label={ai("closeWriting")} onClick={onClose}>
          <X size={15} />
        </IconButton>
      </div>
      <div className={styles.shortcuts}>
        {mode === "write"
          ? (["polish", "shorten", "continue"] as const).map((action) => (
              <Button
                key={action}
                onClick={() => onSubmit(ai(`instructions.${action}`))}
              >
                {ai(`actions.${action}`)}
              </Button>
            ))
          : (["flow", "compare", "relations"] as const).map((kind) => (
              <Button
                key={kind}
                onClick={() => onSubmit(diagram(`suggestions.${kind}.prompt`))}
              >
                {diagram(`suggestions.${kind}.label`)}
              </Button>
            ))}
        <kbd>↵</kbd>
      </div>
    </form>
  );
}
