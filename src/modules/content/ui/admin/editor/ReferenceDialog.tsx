"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  embedSchema,
  type Embed,
} from "@/modules/content/domain/editor-document";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Input } from "@/shared/ui/field/Input";
import { Textarea } from "@/shared/ui/field/Textarea";
import { Field } from "@/shared/ui/field/Field";
import { Button } from "@/shared/ui/button/Button";
import styles from "./ReferenceDialog.module.css";
export function ReferenceDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Embed;
  onClose: () => void;
  onSave: (embed: Embed) => void;
}) {
  const t = useTranslations("admin.editor");
  const [value, setValue] = useState(initial);
  const [error, setError] = useState(false);
  return (
    <Dialog title={t(`blocks.${value.kind}`)} onClose={onClose}>
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          const result = embedSchema.safeParse(value);
          if (result.success) onSave(result.data);
          else setError(true);
        }}
      >
        <Field id="embed-title" label={t("referenceTitle")} required>
          <Input
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
            maxLength={200}
          />
        </Field>
        <Field id="embed-url" label={t("referenceUrl")} required>
          <Input
            type="url"
            value={value.url}
            onChange={(e) => setValue({ ...value, url: e.target.value })}
          />
        </Field>
        {value.kind !== "web" && (
          <Field
            id="embed-creator"
            label={t(value.kind === "movie" ? "director" : "artist")}
          >
            <Input
              value={value.creator}
              onChange={(e) => setValue({ ...value, creator: e.target.value })}
            />
          </Field>
        )}
        {value.kind === "movie" && (
          <Field id="embed-year" label={t("year")}>
            <Input
              value={value.year}
              inputMode="numeric"
              maxLength={4}
              onChange={(e) => setValue({ ...value, year: e.target.value })}
            />
          </Field>
        )}
        {value.kind === "movie" && (
          <Field id="embed-original" label={t("originalTitle")}>
            <Input
              value={value.originalTitle ?? ""}
              onChange={(e) =>
                setValue({ ...value, originalTitle: e.target.value })
              }
            />
          </Field>
        )}
        {value.kind === "web" && (
          <Field id="embed-site" label={t("siteName")}>
            <Input
              value={value.siteName ?? ""}
              onChange={(e) => setValue({ ...value, siteName: e.target.value })}
            />
          </Field>
        )}
        {value.kind === "music" && (
          <Field id="embed-album" label={t("album")}>
            <Input
              value={value.album ?? ""}
              onChange={(e) => setValue({ ...value, album: e.target.value })}
            />
          </Field>
        )}
        <Field id="embed-artwork" label={t("artworkUrl")}>
          <Input
            value={value.artworkUrl ?? ""}
            onChange={(e) => setValue({ ...value, artworkUrl: e.target.value })}
          />
        </Field>
        <Field id="embed-artwork-alt" label={t("imageAlt")}>
          <Input
            value={value.artworkAlt ?? ""}
            onChange={(e) => setValue({ ...value, artworkAlt: e.target.value })}
          />
        </Field>
        <Field id="embed-description" label={t("referenceNote")}>
          <Textarea
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
            rows={3}
          />
        </Field>
        <p className={styles.muted}>{t("referenceHelp")}</p>
        {error && <p role="alert">{t("referenceError")}</p>}
        <Button type="submit" variant="primary">
          {t("insert")}
        </Button>
      </form>
    </Dialog>
  );
}
