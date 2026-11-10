"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { listItemMotion } from "@/shared/lib/motion";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpRight, Bookmark, Images } from "lucide-react";
import {
  PencilLine,
  PencilFrame,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import type { Note, NoteListEntry } from "@/modules/content/domain/models";
import { apiGet } from "@/shared/http/client";
import { Button } from "@/shared/ui/button/Button";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
import { ImageFrame } from "@/shared/ui/image/MediaImage";
const NoteReader = dynamic(
  () => import("./NoteReader").then((module) => module.NoteReader),
  { loading: () => <LoadingSkeleton variant="document" /> },
);
import {
  EngagementProvider,
  useEngagement,
} from "@/modules/engagement/ui/EngagementProvider";
import {
  EngagementStatus,
  InteractionButton,
} from "@/modules/engagement/ui/EngagementActions";
import { targetKey } from "@/modules/engagement/domain/target";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import styles from "./NotesView.module.css";

const sketches = ["sun", "mountain", "boat", "tree"] as const;
function noteSketch(id: string) {
  let hash = 0;
  for (const char of id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return sketches[hash % sketches.length];
}

export function NotesView({
  notes,
  initialNote = null,
}: {
  notes: NoteListEntry[];
  initialNote?: Note | null;
}) {
  return (
    <EngagementProvider
      targets={notes.map((note) => ({ type: "note", id: note.id }))}
    >
      <NotesContent notes={notes} initialNote={initialNote} />
    </EngagementProvider>
  );
}
function NotesContent({
  notes,
  initialNote,
}: {
  notes: NoteListEntry[];
  initialNote: Note | null;
}) {
  const reduced = useReducedMotion();
  const t = useTranslations("notes");
  const format = useFormatter();
  const { states, loading, error } = useEngagement();
  const { principal, openLogin } = useIdentity();
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState(initialNote);
  const [opening, setOpening] = useState<string | null>(null);
  const [readError, setReadError] = useState(false);
  async function open(note: NoteListEntry) {
    if (opening) return;
    setOpening(note.id);
    setReadError(false);
    try {
      const query = new URLSearchParams({ id: note.id, locale: note.locale });
      setSelected(await apiGet<Note>(`/api/v1/notes?${query}`));
    } catch {
      setReadError(true);
    } finally {
      setOpening(null);
    }
  }
  const isSaved = (id: string) =>
    states[targetKey({ type: "note", id })]?.saved;
  const visible = notes.filter((note) => !onlySaved || isSaved(note.id));
  const months = new Map(
    [...new Set(visible.map((note) => note.publishedOn.slice(0, 7)))].map(
      (month, index) => [month, index],
    ),
  );
  return (
    <div className={`inner-page ${styles.notes}`}>
      <ContentHeading
        room="notes"
        title={t("title")}
        description={t("description")}
      />
      <div className={styles.toolbar}>
        <SketchLabel kind="leaf">{t("year")}</SketchLabel>
        <Button
          className={styles.filter}
          disabled={loading || error}
          onClick={() => {
            if (!principal) {
              openLogin();
              return;
            }
            setOnlySaved((value) => !value);
          }}
          aria-pressed={onlySaved}
        >
          <Bookmark size={15} />
          {onlySaved
            ? t("all")
            : loading || error
              ? t("savedFilter")
              : t("saved", {
                  count: notes.filter((note) => isSaved(note.id)).length,
                })}
          {onlySaved && <HanddrawnMark className={styles.filterMark} />}
        </Button>
        <PencilLine className={styles.shore} />
      </div>
      <EngagementStatus />
      {readError && (
        <p role="alert" className={styles.readError}>
          {t("reader.loadError")}
        </p>
      )}
      <ProgressiveList
        key={String(onlySaved)}
        items={visible}
        as="ul"
        className={styles.timeline}
      >
        {(note, index) => {
          const month = note.publishedOn.slice(0, 7);
          const startsMonth =
            month !== visible[index - 1]?.publishedOn.slice(0, 7);
          const paragraphs = note.text
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          const excerpt = paragraphs.slice(0, 2);
          const hasLead = paragraphs.length > 1 && paragraphs[0].length <= 64;
          return (
            <motion.li
              key={note.id}
              id={`note-${note.id}`}
              {...listItemMotion(index, reduced)}
              className={styles.entry}
              data-side={(months.get(month) ?? 0) % 2 === 0 ? "left" : "right"}
            >
              {startsMonth && (
                <h2 className={styles.month}>
                  {format.dateTime(new Date(`${month}-15T12:00:00Z`), {
                    year: "numeric",
                    month: "long",
                  })}
                </h2>
              )}
              <div className={styles.row}>
                <div className={styles.story}>
                  <div className={styles.date}>
                    <DateTime value={note.publishedOn} />
                    {note.mood && <span>{note.mood}</span>}
                  </div>
                  <Button
                    className={styles.open}
                    onClick={() => void open(note)}
                    busy={opening === note.id}
                    aria-haspopup="dialog"
                    aria-label={t("reader.open", {
                      date: note.date,
                      text: note.text.slice(0, 45),
                    })}
                    pressEffect={false}
                  >
                    <span className={styles.preview} data-has-lead={hasLead}>
                      {excerpt.map((paragraph, paragraphIndex) => (
                        <span key={paragraphIndex} className={styles.paragraph}>
                          {paragraph}
                          {paragraphIndex === excerpt.length - 1 &&
                          (note.truncated || paragraphs.length > excerpt.length)
                            ? "…"
                            : ""}
                        </span>
                      ))}
                    </span>
                  </Button>
                  <div className={styles.entryFooter}>
                    {note.tag && (
                      <span className={styles.tag}>#{note.tag}</span>
                    )}
                    <Button
                      className={styles.readMore}
                      onClick={() => void open(note)}
                      disabled={opening !== null}
                      aria-haspopup="dialog"
                    >
                      {t("readMore")}
                      <ArrowUpRight size={13} aria-hidden="true" />
                    </Button>
                    <InteractionButton
                      target={{ type: "note", id: note.id }}
                      kind="save"
                      iconOnly
                    />
                  </div>
                </div>
                <figure className={styles.cover} data-illustrated={!note.cover}>
                  <PencilFrame kind="note" />
                  {note.cover ? (
                    <>
                      <ImageFrame
                        src={note.cover.assetId}
                        alt={note.cover.alt}
                        loading="lazy"
                        fit="cover"
                        sizes="(max-width: 420px) 88vw, 360px"
                      />
                      <span className={styles.imageCount} aria-hidden="true">
                        <Images size={13} />
                        {note.imageCount}
                      </span>
                    </>
                  ) : (
                    <CoastalVignette kind={noteSketch(note.id)} />
                  )}
                </figure>
              </div>
              <PencilLine kind="trail" className={styles.entryShore} />
            </motion.li>
          );
        }}
      </ProgressiveList>
      {!visible.length && (!onlySaved || (!loading && !error)) && (
        <div className={styles.empty}>
          <Bookmark size={28} />
          <p>{t(onlySaved ? "empty" : "noNotes")}</p>
          {onlySaved && (
            <Button variant="quiet" onClick={() => setOnlySaved(false)}>
              {t("all")}
            </Button>
          )}
        </div>
      )}
      <p className={styles.end}>
        <SketchLabel kind="tide">{t("end")}</SketchLabel>
      </p>
      {selected && (
        <NoteReader
          key={selected.id}
          note={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
