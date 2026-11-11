"use client";
import { useTranslations } from "next-intl";
import { Bookmark } from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import { useJournal } from "@/modules/journal/ui/JournalProvider";
import { useArticleReadingValue } from "./useArticleReading";
import styles from "./ArticleBookmark.module.css";

export function ArticleBookmark({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const t = useTranslations("journal");
  const { keep, entries } = useJournal();
  const active = useArticleReadingValue("active");
  const kept = entries.some(
    (entry) =>
      entry.kind === "bookmark" &&
      (entry.href === `/articles/${slug}#section-${active}` ||
        (active === 0 && entry.href === `/articles/${slug}`)),
  );
  return (
    <Button
      className={styles.bookmark}
      data-kept={kept}
      title={t("bookmarkHelp")}
      onClick={() => {
        const section = document.getElementById(`section-${active}`);
        const chapter =
          section?.querySelector("h2,h3")?.textContent?.trim() ?? "";
        keep({
          kind: "bookmark",
          title,
          text: chapter.slice(0, 1000),
          href: `/articles/${slug}${section ? `#section-${active}` : ""}`,
        });
      }}
    >
      <Bookmark size={14} aria-hidden="true" />
      <span aria-live="polite">
        {t(kept ? "bookmarkKept" : "keepBookmark")}
      </span>
    </Button>
  );
}
