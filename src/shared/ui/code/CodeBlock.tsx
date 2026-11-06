"use client";
import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Code2 } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import dynamic from "next/dynamic";
const HighlightedCode = dynamic(() =>
  import("./HighlightedCode").then((module) => module.HighlightedCode),
);
import { useNearViewport } from "@/shared/hooks/useNearViewport";
import { CodeCopy } from "./CodeCopy";
import styles from "./CodeBlock.module.css";

/** Full source stays intact for copying while long snippets have a bounded preview. */
export function CodeBlock({
  code,
  language = "text",
  caption,
}: {
  code: string;
  language?: string;
  caption?: string;
}) {
  const t = useTranslations("code");
  const [expanded, setExpanded] = useState(false);
  const { ref: figure, ready } = useNearViewport<HTMLElement>();
  const id = useId();
  const text = code.replace(/\r\n/g, "\n").replace(/\n$/, "");
  const lines = text.split("\n").length;
  const foldable = lines > 18;
  const highlighted = useMemo(
    () =>
      ready ? (
        <HighlightedCode code={text} language={language.toLowerCase()} />
      ) : (
        text
      ),
    [text, language, ready],
  );
  function toggle() {
    setExpanded((current) => !current);
    if (expanded)
      requestAnimationFrame(() => {
        const element = figure.current;
        const padding =
          Number.parseFloat(
            getComputedStyle(document.documentElement).scrollPaddingTop,
          ) || 0;
        if (
          element &&
          element.getBoundingClientRect().top <
            padding +
              Number.parseFloat(getComputedStyle(element).scrollMarginTop)
        )
          element.scrollIntoView({ block: "start", behavior: "instant" });
      });
  }
  return (
    <figure
      ref={figure}
      className={styles.block}
      data-code-block
      data-collapsed={foldable && !expanded}
    >
      <figcaption className={styles.header}>
        <span className={styles.label}>
          <Code2 size={14} />
          <span>{caption || language}</span>
          <small>{t("lines", { count: lines })}</small>
        </span>
        <CodeCopy code={code} />
      </figcaption>
      <div
        id={id}
        className={styles.viewport}
        tabIndex={0}
        role="region"
        aria-label={t("region", { language: caption || language })}
      >
        <pre className={styles.pre}>
          <span className={styles.numbers} aria-hidden="true">
            {Array.from({ length: lines }, (_, index) => index + 1).join("\n")}
          </span>
          <code>{highlighted}</code>
        </pre>
      </div>
      {foldable && (
        <Button
          className={styles.toggle}
          variant="bare"
          size="sm"
          onClick={toggle}
          aria-expanded={expanded}
          aria-controls={id}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {t(expanded ? "collapse" : "expand")}
        </Button>
      )}
    </figure>
  );
}
