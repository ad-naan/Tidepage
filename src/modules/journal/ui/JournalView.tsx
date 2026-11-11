"use client";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { Button } from "@/shared/ui/button/Button";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { PencilFrame, PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { StationeryDrawing } from "@/shared/ui/illustration/StationeryDrawing";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { usePageNotice } from "@/shared/ui/feedback/NoticeProvider";
import { useJournal } from "./JournalProvider";
import styles from "./JournalView.module.css";

export function JournalView() {
  const t = useTranslations("journal");
  usePageNotice({ key: "journal", title: t("title"), eyebrow: t("eyebrow") });
  const { entries, ready, unavailable, remove } = useJournal();
  const [selected, setSelected] = useState<string | null>(null);
  const index = Math.max(
    0,
    entries.findIndex((entry) => entry.id === selected),
  );
  const entry = entries[index];
  const visibleIndex = Math.floor(index / 8) * 8;
  const leaf = useRef<HTMLElement>(null);
  function turn(next: number) {
    const target = entries[next];
    if (target) setSelected(target.id);
  }
  return (
    <div className={styles.view}>
      <header className={styles.heading}>
        <Link href="/" className={styles.back}>
          {t("backDesk")}
        </Link>
        <span className={styles.eyebrow}>{t("eyebrow")}</span>
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <CoastalVignette kind="boat" className={styles.headingSketch} />
      </header>
      <div className={styles.book}>
        <PencilFrame kind="paper" />
        <aside className={styles.index} aria-label={t("index")}>
          <div className={styles.indexHeading}>
            <StationeryDrawing kind="bookmark" />
            <span>{t("index")}</span>
          </div>
          <PencilLine />
          {ready && entries.length > 0 ? (
            <ol className={styles.indexList} start={visibleIndex + 1}>
              {entries
                .slice(visibleIndex, visibleIndex + 8)
                .map((item, offset) => (
                  <li key={item.id}>
                    <Button
                      className={styles.indexEntry}
                      aria-current={item.id === entry?.id ? "page" : undefined}
                      onClick={() => turn(visibleIndex + offset)}
                    >
                      <span className={styles.number}>
                        {String(visibleIndex + offset + 1).padStart(2, "0")}
                      </span>
                      <span>
                        <span className={styles.indexTitle}>
                          {item.kind === "quote" ? item.text : item.title}
                        </span>
                        <span className={styles.kind}>{t(item.kind)}</span>
                      </span>
                      {item.id === entry?.id && (
                        <HanddrawnMark className={styles.currentMark} />
                      )}
                    </Button>
                  </li>
                ))}
            </ol>
          ) : (
            <div className={styles.indexEmpty}>
              <StationeryDrawing kind="notebook" />
              <p>{t("indexEmpty")}</p>
            </div>
          )}
          <div className={styles.indexFoot}>
            <CoastalVignette kind="tree" />
            <span>{t("collected", { count: entries.length })}</span>
          </div>
        </aside>
        <svg
          className={styles.binding}
          viewBox="0 0 24 440"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <path d="M12 2q-5 102-2 215t0 222M16 4q-4 105-2 217t0 216" />
          {[44, 110, 176, 242, 308, 374].map((y) => (
            <path key={y} d={`M5 ${y}c-10-8-8 18 7 11s17 14 5 12`} />
          ))}
        </svg>
        <section
          ref={leaf}
          tabIndex={-1}
          className={styles.leaf}
          aria-label={t("leaf")}
        >
          <div className={styles.leafTop}>
            <span>{t(entry?.kind ?? "eyebrow")}</span>
            <span aria-live="polite">
              {t("pageNumber", {
                current: entry ? index + 1 : 0,
                total: entries.length,
              })}
            </span>
          </div>
          {!ready ? (
            <LoadingSkeleton variant="rows" />
          ) : unavailable ? (
            <div className={styles.empty}>
              <h2>{t("unavailable")}</h2>
              <p>{t("failureHelp")}</p>
            </div>
          ) : entry ? (
            <>
              <div className={styles.reading} key={entry.id}>
                <DateTime value={entry.savedAt} className={styles.date} />
                <h2 className={styles.entryHeading}>
                  {t(
                    entry.kind === "quote" ? "quoteHeading" : "bookmarkHeading",
                  )}
                </h2>
                {entry.kind === "quote" ? (
                  <blockquote className={styles.quotation}>
                    <span aria-hidden="true" className={styles.quoteMark}>
                      “
                    </span>
                    {entry.text}
                  </blockquote>
                ) : (
                  <div className={styles.bookmarkText}>
                    <StationeryDrawing kind="bookmark" />
                    <p>{entry.text || entry.title}</p>
                    <span>{t("bookmarkContext")}</span>
                  </div>
                )}
                <div className={styles.source}>
                  <PencilLine />
                  <span>{t("from")}</span>
                  <Link href={entry.href}>
                    {entry.title}
                    <StationeryDrawing kind="arrow" />
                  </Link>
                </div>
              </div>
              <div className={styles.leafBottom}>
                <Button
                  className={styles.remove}
                  onClick={() => {
                    const next = entries[index + 1] ?? entries[index - 1];
                    if (remove(entry.id)) {
                      setSelected(next?.id ?? null);
                      leaf.current?.focus({ preventScroll: true });
                    }
                  }}
                >
                  {t("takeOut")}
                </Button>
                <CoastalVignette kind="boat" />
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <StationeryDrawing kind="pencil" />
              <h2>{t("emptyTitle")}</h2>
              <p>{t("emptyHelp")}</p>
              <Link href="/articles">
                {t("browse")}
                <StationeryDrawing kind="arrow" />
              </Link>
            </div>
          )}
        </section>
      </div>
      <nav className={styles.paging} aria-label={t("pages")}>
        <Button
          disabled={index === 0 || !entry}
          onClick={() => turn(index - 1)}
        >
          <StationeryDrawing kind="arrow" className={styles.previous} />
          {t("previous")}
        </Button>
        <span>
          {t("pageNumber", {
            current: entry ? index + 1 : 0,
            total: entries.length,
          })}
        </span>
        <Button
          disabled={!entry || index === entries.length - 1}
          onClick={() => turn(index + 1)}
        >
          {t("nextPage")}
          <StationeryDrawing kind="arrow" />
        </Button>
      </nav>
      <Disclosure className={styles.storage} summary={t("localLabel")}>
        <p>{t("localHelp")}</p>
      </Disclosure>
    </div>
  );
}
