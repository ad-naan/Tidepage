"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { useThemePreference } from "@/shared/ui/preferences/useThemePreference";
import { Button } from "@/shared/ui/button/Button";
import { ThemeToggle } from "@/shared/ui/preferences/ThemeToggle";
import { Text } from "@/shared/ui/typography/Text";
import styles from "./RouteFallback.module.css";

export function RouteFallback({
  kind,
  onRetry,
}: {
  kind: "missing" | "error";
  onRetry?: () => void;
}) {
  const t = useTranslations(kind === "missing" ? "notFound" : "error");
  const [pending, startTransition] = useTransition();
  const { theme, setPreference } = useThemePreference();
  return (
    <main id="main-content" className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label={t("home")}>
          <AuthorSignature mark />
        </Link>
        <div className={styles.headerTools}>
          <Text variant="caption" tone="muted" className={styles.edition}>
            {t("edition")}
          </Text>
          <ThemeToggle
            theme={theme}
            onChange={() => setPreference(theme === "light" ? "dark" : "light")}
          />
        </div>
      </header>
      <div className={styles.content}>
        <div className={styles.copy}>
          <Text
            as="p"
            variant="caption"
            tone="accent"
            className={styles.eyebrow}
          >
            <span aria-hidden="true" />
            {t("eyebrow")}
          </Text>
          <Text as="h1" variant="display" className={styles.title}>
            {t("title")}
          </Text>
          <Text as="p" tone="muted" className={styles.description}>
            {t("description")}
          </Text>
          <div className={styles.actions}>
            {kind === "error" ? (
              <Button
                className={styles.primary}
                busy={pending}
                onClick={() => startTransition(() => onRetry?.())}
              >
                <RotateCcw size={15} aria-hidden="true" />
                {t("retry")}
              </Button>
            ) : (
              <Link href="/" className={styles.primary}>
                <ArrowLeft size={15} aria-hidden="true" />
                {t("home")}
              </Link>
            )}
            <Link
              href={kind === "error" ? "/" : "/articles"}
              className={styles.secondary}
            >
              {t(kind === "error" ? "home" : "browse")}
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div
          className={styles.illustration}
          aria-hidden="true"
          data-kind={kind}
        >
          <span className={styles.number}>
            {kind === "missing" ? "404" : "···"}
          </span>
          <svg viewBox="0 0 520 310" fill="none">
            <circle cx="415" cy="95" r="34" fill="var(--wash)" />
            <g
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#tidepage-pencil)"
            >
              <path
                d="M354 170q-2-22 8-40 5-18 10-37l16 2 7 49 9 26M357 171l44 1M366 137l27 1m-23-20 19 1M371 93l3-9 11 1 4 10M376 99l-1 12 9 1-1-12Z"
                fill="var(--paper)"
              />
              <path
                d="m389 100 75-21m-75 30 80 17"
                stroke="var(--accent)"
                opacity=".45"
              />
              <path d="M280 187q28-15 49-14 17-25 48-14 23 3 43 16l61 12M46 192l56-2 33-9 30 8 30 1M306 194l83-2 75 4" />
              <path
                d="M37 214q37-6 74-1m20-3 30 2m115-4 38 2m25 4q63-7 126-2M57 239l67-3m14 4 47-2m130-3 88 3m18-2 41 1M78 268l51-2m57 9 90-3m43-8 57 2"
                opacity=".6"
              />
              <path
                d="M100 225c-36-30-46-85-13-104 33-20 77 1 57 31-21 29-53 7-40-14 16-23 70-3 98 62"
                strokeDasharray="3 7"
                opacity=".45"
              />
              <path d="m164 204 98-17-29 39-45-2Z" fill="var(--paper)" />
              <path d="m164 204 50 5 48-22-46 34-28 3m26-15 2 12" />
              <path d="m214 209-6-49 54 27-48 22Z" fill="var(--wash)" />
              <path d="m208 160 21 34-15 15m-35 24 38 2m10-3 22-1" />
              <path
                d="m186 98 7-4 7 3m42-39 7-5 10 2m-59 24 5-3 7 2"
                opacity=".65"
              />
              <path
                d="m318 178 4-9 6 2m88 10-2-8 5-5m15 13 2-12m-91 29 11-2m-53 57 8-2m100-29 10-1"
                opacity=".5"
              />
            </g>
          </svg>
          <span className={styles.annotation}>{t("annotation")}</span>
        </div>
      </div>
      <footer className={styles.footer}>
        <span className={styles.footerLine} aria-hidden="true" />
        <Text as="p" variant="caption" tone="muted">
          {t("note")}
        </Text>
        <span className={styles.pageMark} aria-hidden="true">
          {kind === "missing" ? "— 404 —" : "— ∿ —"}
        </span>
      </footer>
    </main>
  );
}
