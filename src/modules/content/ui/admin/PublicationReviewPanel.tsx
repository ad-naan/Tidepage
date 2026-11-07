"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Anchor } from "@/shared/ui/link/Anchor";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { apiSend, ApiClientError } from "@/shared/http/client";
import type { PublicationRequest } from "@/modules/content/domain/publication";
import {
  publicationReviewTools,
  type PublicationReview,
} from "@/modules/content/domain/publication-review";
import styles from "./PublicationReviewPanel.module.css";

export function PublicationReviewPanel({
  draft,
  enabled,
  disabled,
}: {
  draft: PublicationRequest;
  enabled: boolean;
  disabled: boolean;
}) {
  const t = useTranslations("admin.publicationReview");
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<PublicationReview | null>(null);
  const [error, setError] = useState<"failed" | "conflict" | null>(null);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (disabled) {
      pending.current?.abort();
      setReview(null);
      setError(null);
    }
  }, [disabled]);

  async function run() {
    if (!enabled || disabled || pending.current) return;
    const request = new AbortController();
    pending.current = request;
    setBusy(true);
    setError(null);
    setReview(null);
    try {
      const result = await apiSend<PublicationReview>(
        "/api/v1/ai/article-review",
        "POST",
        draft,
        { signal: request.signal },
      );
      if (!request.signal.aborted) setReview(result);
    } catch (error) {
      if (!request.signal.aborted)
        setError(
          error instanceof ApiClientError && error.status === 409
            ? "conflict"
            : "failed",
        );
    } finally {
      pending.current = null;
      setBusy(false);
    }
  }

  return (
    <section className={styles.review} aria-labelledby={id}>
      <h3 id={id}>{t("title")}</h3>
      <p>{t(enabled ? "description" : "unavailable")}</p>
      {enabled && (
        <div className={styles.actions}>
          <Button
            variant="quiet"
            onClick={() => void run()}
            busy={busy}
            disabled={disabled}
          >
            {t("run")}
          </Button>
          {busy && (
            <Button variant="quiet" onClick={() => pending.current?.abort()}>
              {t("cancel")}
            </Button>
          )}
        </div>
      )}
      {busy && <p role="status">{t("running")}</p>}
      {error && <p role="alert">{t(error)}</p>}
      {review && !disabled && (
        <div className={styles.result}>
          <p role="status">{t("revision", { revision: review.revision })}</p>
          <p>{review.report.summary}</p>
          {!!review.report.suggestions.length && (
            <ol className={styles.suggestions}>
              {review.report.suggestions.map((item, index) => (
                <li key={index}>
                  <strong>{t(`priority.${item.priority}`)}</strong>
                  <p>{item.observation}</p>
                  <p>{item.recommendation}</p>
                  <small>
                    {t("citations", {
                      ids: [...new Set(item.evidence)].join(", "),
                    })}
                  </small>
                </li>
              ))}
            </ol>
          )}
          <Disclosure summary={t("evidence")}>
            <ol className={styles.sources}>
              {review.evidence.map((source) => {
                const tool = publicationReviewTools.find(
                  (name) => name === source.tool,
                );
                return (
                  <li key={source.id}>
                    <strong>
                      {source.id} ·{" "}
                      {tool ? t(`tools.${tool}`) : t("externalSource")}
                    </strong>
                    <dl>
                      {source.facts.map(({ label, value }) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                    {source.links?.map(({ title, href }) => (
                      <Anchor
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {title}
                      </Anchor>
                    ))}
                  </li>
                );
              })}
            </ol>
          </Disclosure>
        </div>
      )}
    </section>
  );
}
