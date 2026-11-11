"use client";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Link } from "@/shared/i18n/navigation";
import { StationeryDrawing } from "@/shared/ui/illustration/StationeryDrawing";
import { Quote } from "lucide-react";
import { useJournal } from "./JournalProvider";
import styles from "./Journal.module.css";

export function JournalLink({ className = "" }: { className?: string }) {
  const t = useTranslations("journal");
  const { entries } = useJournal();
  return (
    <Link href="/journal" className={`${styles.trigger} ${className}`}>
      <StationeryDrawing kind="bookmark" />
      <span>{t("title")}</span>
      {entries.length > 0 && (
        <span className={styles.count}>{entries.length}</span>
      )}
    </Link>
  );
}

export function KeepQuote({
  text,
  title,
  href = "/quotes",
}: {
  text: string;
  title: string;
  href?: string;
}) {
  const t = useTranslations("journal");
  const { entries, keep } = useJournal();
  const kept = entries.some(
    (entry) =>
      entry.kind === "quote" && entry.href === href && entry.text === text,
  );
  return (
    <Button
      className={styles.keep}
      data-kept={kept}
      onClick={() => keep({ kind: "quote", text, title, href })}
    >
      <Quote size={14} aria-hidden="true" />
      <span aria-live="polite">{t(kept ? "quoteKept" : "keepQuote")}</span>
    </Button>
  );
}
