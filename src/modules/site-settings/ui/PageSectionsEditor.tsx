"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Field } from "@/shared/ui/field/Field";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { parsePageSections, type PageSection } from "../domain/pages";
import styles from "./PageSectionsEditor.module.css";

export function PageSectionsEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const t = useTranslations("admin.settings.pageEditor");
  const id = useId();
  const sections = parsePageSections(value);
  function save(next: PageSection[]) {
    onChange(JSON.stringify(next));
  }
  function update(index: number, patch: Partial<PageSection>) {
    save(
      sections.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }
  function move(index: number, direction: number) {
    const next = [...sections];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    save(next);
  }
  return (
    <section className={styles.editor} aria-label={label}>
      <h2>{label}</h2>
      {sections.map((section, index) => (
        <div className={styles.section} key={index}>
          <div className={styles.controls}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <IconButton
              size="sm"
              aria-label={`${t("up")} ${index + 1}`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp size={14} />
            </IconButton>
            <IconButton
              size="sm"
              aria-label={`${t("down")} ${index + 1}`}
              disabled={index === sections.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown size={14} />
            </IconButton>
            <IconButton
              size="sm"
              aria-label={`${t("remove")} ${index + 1}`}
              onClick={() => save(sections.filter((_, i) => i !== index))}
            >
              <X size={14} />
            </IconButton>
          </div>
          <Field id={`${id}-${index}-title`} label={t("sectionTitle")}>
            <Input
              value={section.title}
              maxLength={120}
              onChange={(event) => update(index, { title: event.target.value })}
            />
          </Field>
          <Field
            id={`${id}-${index}-body`}
            label={t("paragraphs")}
            description={t("paragraphHint")}
          >
            <Textarea
              value={section.paragraphs.join("\n\n")}
              rows={5}
              onChange={(event) =>
                update(index, {
                  paragraphs: event.target.value.split(/\n\s*\n/),
                })
              }
            />
          </Field>
        </div>
      ))}
      <Button
        variant="quiet"
        disabled={sections.length >= 20}
        onClick={() => save([...sections, { title: "", paragraphs: [""] }])}
      >
        <Plus size={14} />
        {t("add")}
      </Button>
    </section>
  );
}
