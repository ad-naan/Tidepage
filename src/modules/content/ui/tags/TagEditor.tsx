"use client";
import type { ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/shared/ui/field/Input";
import { Button } from "@/shared/ui/button/Button";
import type { Locale } from "@/shared/i18n/config";
import {
  normalizeTags,
  parseTags,
  tagKey,
} from "@/modules/content/domain/tags";
import { useTagSuggestions } from "./useTagSuggestions";
import styles from "./Tags.module.css";

export function TagEditor({
  value,
  onValueChange,
  locale,
  multiple = false,
  ...props
}: Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  locale: Locale;
  multiple?: boolean;
}) {
  const t = useTranslations("tags");
  const parts = multiple ? value.split(/[,，]/) : [value];
  const query = (parts.at(-1) ?? "").trim().slice(0, 80);
  const suggestions = useTagSuggestions(locale, query);
  const selected = new Set(
    parseTags(multiple ? parts.slice(0, -1).join(",") : value).map(tagKey),
  );
  const choices = suggestions.tags
    .filter((tag) => !selected.has(tag.key))
    .slice(0, 6);
  return (
    <div className={styles.editor}>
      <Input
        {...props}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <p className={styles.hint}>{t(multiple ? "editorHelp" : "singleHelp")}</p>
      <div className={styles.results} aria-label={t("reuse")}>
        {choices.map((tag) => (
          <Button
            key={tag.key}
            size="sm"
            className={styles.tag}
            onClick={() =>
              onValueChange(
                multiple
                  ? normalizeTags([...parts.slice(0, -1), tag.label]).join(
                      ",",
                    ) + ","
                  : tag.label,
              )
            }
          >
            #{tag.label}
          </Button>
        ))}
      </div>
      {suggestions.error && (
        <p className={styles.hint}>
          {t("suggestionsFailed")}{" "}
          <Button size="sm" onClick={suggestions.retry}>
            {t("retry")}
          </Button>
        </p>
      )}
    </div>
  );
}
