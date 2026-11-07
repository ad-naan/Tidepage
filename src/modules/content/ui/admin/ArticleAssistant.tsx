"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { useTranslations } from "next-intl";
import { Select } from "@/shared/ui/select/Select";
import { Button } from "@/shared/ui/button/Button";
import { apiSend } from "@/shared/http/client";
import { localeRegistry, locales, type Locale } from "@/shared/i18n/config";
import { WritingPanel } from "@/modules/ai/ui/WritingPanel";
import { createHttpWritingAgent } from "@/modules/ai/ui/writing-agent";
import {
  articleContextLimit,
  type MetadataSuggestion,
} from "@/modules/ai/domain/writing";
import {
  articleTranslationSchema,
  documentText,
  type ArticleTranslation,
} from "@/modules/content/domain/editor-document";
import {
  applyTranslationSegments,
  translationSegments,
} from "@/modules/content/domain/translation";
import styles from "./ArticleEditorView.module.css";

const endpoint = "/api/v1/ai/writing";
const writer = createHttpWritingAgent(endpoint);
type Suggestion =
  | { task: "metadata"; value: MetadataSuggestion }
  | { task: "translate"; value: ArticleTranslation; locale: Locale };

export function ArticleAssistant({
  editor,
  active,
  enabled,
  locale,
  snapshot,
  version,
  apply,
}: {
  editor: Editor;
  active: boolean;
  enabled: boolean;
  locale: Locale;
  snapshot: () => ArticleTranslation;
  version: () => number;
  apply: (suggestion: Suggestion) => boolean;
}) {
  const t = useTranslations("admin.ai");
  const fields = useTranslations("admin.editor.fields");
  const choices = locales.filter((code) => code !== locale);
  const [target, setTarget] = useState(choices[0]);
  const [task, setTask] = useState<"metadata" | "translate" | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const originalVersion = useRef(0);
  useEffect(() => {
    if (active) return () => controller.current?.abort();
  }, [active]);
  async function generate(nextTask: NonNullable<typeof task>) {
    if (!enabled || controller.current) return;
    const current = snapshot();
    const context = documentText(current.body).trim();
    const segments =
      nextTask === "translate" ? translationSegments(current) : [];
    setSuggestion(null);
    if (
      nextTask === "translate" &&
      (segments.length > 256 ||
        segments.reduce((sum, value) => sum + value.length, 0) >
          articleContextLimit)
    ) {
      setError(t("translationLimit"));
      return;
    }
    if (nextTask === "metadata" ? !context : !segments.length) {
      setError(t("addContent"));
      return;
    }
    setError("");
    setTask(nextTask);
    originalVersion.current = version();
    const request = new AbortController();
    controller.current = request;
    try {
      if (nextTask === "metadata") {
        const value = await apiSend<MetadataSuggestion>(
          endpoint,
          "POST",
          {
            task: nextTask,
            locale,
            title: current.title,
            context: context.slice(0, articleContextLimit),
          },
          { signal: request.signal },
        );
        setSuggestion({ task: nextTask, value });
      } else {
        const translated = await apiSend<string[]>(
          endpoint,
          "POST",
          {
            task: nextTask,
            locale: target,
            sourceLocale: locale,
            segments,
          },
          { signal: request.signal },
        );
        const value = articleTranslationSchema.parse(
          applyTranslationSegments(current, translated),
        );
        setSuggestion({ task: nextTask, value, locale: target });
      }
    } catch {
      if (!request.signal.aborted) setError(t("suggestionFailed"));
    } finally {
      controller.current = null;
      setTask(null);
    }
  }
  return (
    <div className={styles.fields}>
      {enabled && (
        <section className={styles.fields} aria-label={t("editorialTools")}>
          <Button
            busy={task === "metadata"}
            disabled={!!task}
            onClick={() => void generate("metadata")}
          >
            {t("metadata")}
          </Button>
          {choices.length > 0 && (
            <>
              <Select
                label={t("targetLanguage")}
                value={target}
                disabled={!!task}
                options={choices.map((code) => ({
                  value: code,
                  label: localeRegistry[code].name,
                }))}
                onValueChange={setTarget}
              />
              <Button
                busy={task === "translate"}
                disabled={!!task}
                onClick={() => void generate("translate")}
              >
                {t("translate")}
              </Button>
            </>
          )}
          {task && (
            <Button onClick={() => controller.current?.abort()}>
              {t("stop")}
            </Button>
          )}
          {error && <p role="alert">{error}</p>}
          {suggestion && (
            <div>
              <dl>
                {(
                  ["title", "excerpt", "seoTitle", "seoDescription"] as const
                ).map((field) => (
                  <div key={field}>
                    <dt>{fields(field)}</dt>
                    <dd>{suggestion.value[field]}</dd>
                  </div>
                ))}
                <div>
                  <dt>{fields("tags")}</dt>
                  <dd>{suggestion.value.tags.join(", ")}</dd>
                </div>
              </dl>
              {suggestion.task === "metadata" ? (
                <ul>
                  {suggestion.value.review.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              ) : (
                <>
                  <p>
                    {t("translationReview", {
                      language: localeRegistry[suggestion.locale].name,
                    })}
                  </p>
                  <pre className={styles.translationPreview}>
                    {documentText(suggestion.value.body)}
                  </pre>
                </>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  if (
                    version() !== originalVersion.current ||
                    !apply(suggestion)
                  )
                    setError(t("conflict"));
                  else setSuggestion(null);
                }}
              >
                {t("applyDraft")}
              </Button>
              <Button onClick={() => setSuggestion(null)}>
                {t("discard")}
              </Button>
            </div>
          )}
        </section>
      )}
      <WritingPanel
        editor={editor}
        active={active}
        contentLocale={locale}
        agent={enabled ? writer : undefined}
      />
    </div>
  );
}
