"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Anchor } from "@/shared/ui/link/Anchor";
import { apiSend } from "@/shared/http/client";
import type { Locale } from "@/shared/i18n/config";
import { feedPath } from "@/shared/config/site";
import type { SiteSuggestion } from "@/modules/ai/domain/writing";

export function SiteEditorialAssistant({
  locale,
  fields,
  apply,
}: {
  locale: Locale;
  fields: Record<string, string>;
  apply: (suggestion: SiteSuggestion) => void;
}) {
  const t = useTranslations("admin.ai");
  const labels = useTranslations("admin.settings.fields");
  const [result, setResult] = useState<SiteSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const source = useRef(fields);
  useEffect(() => () => request.current?.abort(), []);
  async function generate() {
    if (request.current) return;
    if (!fields.siteName?.trim()) {
      setError(t("siteNameRequired"));
      return;
    }
    setError("");
    setBusy(true);
    setResult(null);
    source.current = fields;
    const controller = new AbortController();
    request.current = controller;
    try {
      const suggestion = await apiSend<SiteSuggestion>(
        "/api/v1/ai/writing",
        "POST",
        {
          task: "site",
          locale,
          name: fields.siteName.slice(0, 200),
          description: (fields.siteDescription ?? "").slice(0, 2000),
          context: [
            fields.heroTitle,
            fields.heroDescription,
            fields.siteAboutIntro,
          ]
            .filter(Boolean)
            .join("\n")
            .slice(0, 6000),
        },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setResult(suggestion);
    } catch {
      if (!controller.signal.aborted) setError(t("suggestionFailed"));
    } finally {
      request.current = null;
      setBusy(false);
    }
  }
  return (
    <section aria-label={t("siteTools")}>
      <p>{t("providerHelp")}</p>
      <Button variant="quiet" busy={busy} onClick={() => void generate()}>
        {t("siteGenerate")}
      </Button>
      {busy && (
        <Button variant="quiet" onClick={() => request.current?.abort()}>
          {t("stop")}
        </Button>
      )}
      <p>
        <Anchor href={feedPath(locale)}>RSS</Anchor> ·{" "}
        <Anchor href={`/llms.txt?locale=${locale}`}>llms.txt</Anchor>
      </p>
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <dl>
            <dt>{labels("seoTitle")}</dt>
            <dd>{result.seoTitle}</dd>
            <dt>{labels("seoDescription")}</dt>
            <dd>{result.seoDescription}</dd>
          </dl>
          <ul>
            {result.review.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <Button
            variant="primary"
            onClick={() => {
              if (source.current !== fields) setError(t("conflict"));
              else {
                apply(result);
                setResult(null);
              }
            }}
          >
            {t("applyDraft")}
          </Button>
          <Button variant="quiet" onClick={() => setResult(null)}>
            {t("discard")}
          </Button>
        </>
      )}
    </section>
  );
}
