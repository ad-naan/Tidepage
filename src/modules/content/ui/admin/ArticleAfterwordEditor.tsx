"use client";
import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Field } from "@/shared/ui/field/Field";
import { Textarea } from "@/shared/ui/field/Textarea";
import { DatePicker } from "@/shared/ui/date-picker/DatePicker";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { dateKey } from "@/shared/lib/date-time";
import type { Afterword } from "@/modules/content/domain/afterword";
import styles from "./ArticleAfterwordEditor.module.css";

export function ArticleAfterwordEditor({
  value,
  onChange,
}: {
  value?: Afterword;
  onChange: (value: Afterword) => void;
}) {
  const t = useTranslations("admin.afterword");
  const addButton = useRef<HTMLButtonElement>(null);
  const lastUpdate = useRef<HTMLTextAreaElement>(null);
  const focusRequest = useRef<"new" | "add" | null>(null);
  const current = value ?? { note: "", updates: [] };
  useLayoutEffect(() => {
    if (focusRequest.current === "new") lastUpdate.current?.focus();
    if (focusRequest.current === "add") addButton.current?.focus();
    focusRequest.current = null;
  }, [current.updates.length]);
  return (
    <Disclosure summary={t("title")}>
      <div className={styles.editor}>
        <Field id="author-afterword" label={t("note")} description={t("help")}>
          <Textarea
            rows={4}
            maxLength={1200}
            value={current.note}
            onChange={(event) =>
              onChange({ ...current, note: event.target.value })
            }
          />
        </Field>
        {current.updates.map((update, index) => (
          <div className={styles.update} key={index}>
            <div className={styles.meta}>
              <DatePicker
                required
                label={t("date")}
                value={update.date}
                onValueChange={(date) =>
                  onChange({
                    ...current,
                    updates: current.updates.map((item, i) =>
                      i === index ? { ...item, date } : item,
                    ),
                  })
                }
              />
              <IconButton
                aria-label={t("remove", { number: index + 1 })}
                onClick={() => {
                  focusRequest.current = "add";
                  onChange({
                    ...current,
                    updates: current.updates.filter((_, i) => i !== index),
                  });
                }}
              >
                <X size={14} />
              </IconButton>
            </div>
            <Textarea
              ref={
                index === current.updates.length - 1 ? lastUpdate : undefined
              }
              aria-label={t("edit", { number: index + 1 })}
              rows={3}
              maxLength={2000}
              value={update.text}
              onChange={(event) => {
                // Keep the draft editable while the author replaces a sentence.
                onChange({
                  ...current,
                  updates: current.updates.map((item, i) =>
                    i === index ? { ...item, text: event.target.value } : item,
                  ),
                });
              }}
            />
          </div>
        ))}
        <Button
          ref={addButton}
          variant="quiet"
          size="sm"
          disabled={current.updates.length >= 12}
          onClick={() => {
            focusRequest.current = "new";
            onChange({
              ...current,
              updates: [
                ...current.updates,
                { date: dateKey(new Date()), text: "" },
              ],
            });
          }}
        >
          <Plus size={14} />
          {t("add")}
        </Button>
      </div>
    </Disclosure>
  );
}
