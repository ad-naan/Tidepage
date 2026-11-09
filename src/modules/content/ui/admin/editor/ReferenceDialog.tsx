"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { apiGet } from "@/shared/http/client";
import type { LinkPreview } from "@/shared/contracts/link-preview";
import { referenceUrl } from "@/modules/content/domain/reference-url";
import { ReferenceCard } from "../../rich-text/ReferenceCard";
import styles from "./ReferenceDialog.module.css";

function fromPreview(
  url: string,
  kind: Embed["kind"],
  data: LinkPreview,
): Embed {
  const host = new URL(url).hostname;
  return {
    url,
    kind: kind === "web" ? (data.kind ?? kind) : kind,
    title: data.title || host.slice(0, 200),
    description: data.description ?? "",
    siteName: data.siteName || host.slice(0, 80),
    creator: data.creator ?? "",
    album: data.album ?? "",
    year: data.year ?? "",
    artworkAssetId: "",
    artworkUrl: data.artworkUrl ?? "",
    artworkAlt: data.artworkAlt ?? "",
  };
}

export function ReferenceDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Embed;
  onClose: () => void;
  onSave: (embed: Embed) => boolean;
}) {
  const t = useTranslations("admin.editor");
  const [input, setInput] = useState(initial.url);
  const [overrides, setOverrides] = useState<Partial<Embed>>({});
  const [preview, setPreview] = useState<{ url: string; data: LinkPreview }>();
  const [error, setError] = useState<
    "referenceError" | "referenceChanged" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef<{
    url: string;
    controller: AbortController;
    result: Promise<LinkPreview>;
  }>(null);
  const parsedUrl = referenceUrl(input);
  const original =
    initial.title &&
    (input.trim() === initial.url ||
      (parsedUrl && parsedUrl === referenceUrl(initial.url)))
      ? initial
      : null;
  const url = original?.url ?? parsedUrl;
  const resolved = preview?.url === url ? preview?.data : undefined;
  const pending = !!url && !original && !resolved;
  const status = pending
    ? "referenceLoading"
    : resolved && !resolved.title && !resolved.artworkUrl
      ? "referenceFallback"
      : !url
        ? "referenceHelp"
        : null;
  const value = url
    ? {
        ...(original ?? fromPreview(url, initial.kind, resolved ?? {})),
        ...overrides,
      }
    : null;

  const load = useCallback((url: string) => {
    if (request.current?.url === url) return request.current;
    request.current?.controller.abort();
    const controller = new AbortController();
    const result = apiGet<LinkPreview>(
      `/api/v1/link-preview?url=${encodeURIComponent(url)}`,
      { signal: controller.signal },
    )
      .catch(() => ({}))
      .then((data) => {
        if (!controller.signal.aborted) setPreview({ url, data });
        return data;
      });
    const next = { url, controller, result };
    request.current = next;
    return next;
  }, []);
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      request.current?.controller.abort();
      request.current = null;
    };
  }, []);
  useEffect(() => {
    if (!url || original) return;
    const timer = setTimeout(() => load(url), 350);
    return () => clearTimeout(timer);
  }, [url, original, load]);

  function change(fields: Partial<Embed>) {
    setOverrides((current) => ({ ...current, ...fields }));
    setError(null);
  }
  async function submit() {
    if (!url || !value) {
      setError("referenceError");
      return;
    }
    let embed = value;
    if (pending) {
      setSubmitting(true);
      const task = load(url);
      const data = await task.result;
      if (task.controller.signal.aborted) return;
      embed = { ...fromPreview(url, initial.kind, data), ...overrides };
      setSubmitting(false);
    }
    const result = embedSchema.safeParse(embed);
    if (!result.success) setError("referenceError");
    else if (!onSave(result.data)) setError("referenceChanged");
  }

  return (
    <Dialog title={t("referenceCard")} onClose={onClose}>
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          if (!submitting) void submit();
        }}
      >
        <Field id="embed-url" label={t("referenceUrl")} required>
          <Input
            ref={inputRef}
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://"
            value={input}
            maxLength={Math.max(2048, initial.url.length)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing)
                return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            onChange={(event) => {
              const next = event.target.value;
              if (referenceUrl(next) !== url) {
                request.current?.controller.abort();
                request.current = null;
                setPreview(undefined);
                setOverrides({});
                setSubmitting(false);
              }
              setError(null);
              setInput(next);
            }}
          />
        </Field>
        {value && (
          <div className={styles.preview} aria-busy={pending}>
            <ReferenceCard value={value} compact />
          </div>
        )}
        {status && (
          <p role="status" className={styles.muted}>
            {t(status)}
          </p>
        )}
        {value && !pending && (
          <Disclosure summary={t("referenceDetails")}>
            <div className={styles.details}>
              <Field id="embed-title" label={t("referenceTitle")}>
                <Input
                  value={value.title}
                  maxLength={200}
                  onChange={(e) => change({ title: e.target.value })}
                />
              </Field>
              {value.kind !== "web" && (
                <Field
                  id="embed-creator"
                  label={t(value.kind === "movie" ? "director" : "artist")}
                >
                  <Input
                    value={value.creator}
                    onChange={(e) => change({ creator: e.target.value })}
                  />
                </Field>
              )}
              {value.kind === "movie" && (
                <Field id="embed-year" label={t("year")}>
                  <Input
                    value={value.year}
                    inputMode="numeric"
                    maxLength={4}
                    onChange={(e) => change({ year: e.target.value })}
                  />
                </Field>
              )}
              {value.kind === "movie" && (
                <Field id="embed-original" label={t("originalTitle")}>
                  <Input
                    value={value.originalTitle ?? ""}
                    onChange={(e) => change({ originalTitle: e.target.value })}
                  />
                </Field>
              )}
              <Field id="embed-site" label={t("siteName")}>
                <Input
                  value={value.siteName ?? ""}
                  onChange={(e) => change({ siteName: e.target.value })}
                />
              </Field>
              {value.kind === "music" && (
                <Field id="embed-album" label={t("album")}>
                  <Input
                    value={value.album ?? ""}
                    onChange={(e) => change({ album: e.target.value })}
                  />
                </Field>
              )}
              <Field id="embed-artwork" label={t("artworkUrl")}>
                <Input
                  value={value.artworkUrl ?? ""}
                  onChange={(e) => change({ artworkUrl: e.target.value })}
                />
              </Field>
              <Field id="embed-artwork-alt" label={t("imageAlt")}>
                <Input
                  value={value.artworkAlt ?? ""}
                  onChange={(e) => change({ artworkAlt: e.target.value })}
                />
              </Field>
              <Field id="embed-description" label={t("referenceNote")}>
                <Textarea
                  value={value.description}
                  onChange={(e) => change({ description: e.target.value })}
                  rows={3}
                />
              </Field>
            </div>
          </Disclosure>
        )}
        {error && <p role="alert">{t(error)}</p>}
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="primary"
            busy={submitting}
            disabled={!input.trim()}
          >
            {t(original ? "referenceSave" : "referenceInsert")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
