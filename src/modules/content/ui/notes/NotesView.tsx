"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Bookmark, Images } from "lucide-react";
import {
  PencilFrame,
  PencilLine,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import type { Note } from "@/modules/content/domain/models";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Button } from "@/shared/ui/button/Button";
import dynamic from "next/dynamic";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { ProgressiveList } from "@/shared/ui/loading/ProgressiveList";
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

export function NotesView({ notes }: { notes: Note[] }) {
  return (
    <EngagementProvider
      targets={notes.map((note) => ({ type: "note", id: note.id }))}
    >
      <NotesContent notes={notes} />
    </EngagementProvider>
  );
}
function NotesContent({ notes }: { notes: Note[] }) {
  const t = useTranslations("notes");
  const { states, loading, error } = useEngagement();
  const { principal, openLogin } = useIdentity();
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const isSaved = (id: string) =>
    states[targetKey({ type: "note", id })]?.saved;
  const visible = notes.filter((note) => !onlySaved || isSaved(note.id));
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
      <ProgressiveList
        key={String(onlySaved)}
        items={visible}
        className={styles.grid}
      >
        {(note) => {
          const images = note.images;
          return (
            <article className={styles.card} key={note.id}>
              <PencilFrame kind="note" />
              <Button
                className={styles.open}
                onClick={() => setSelected(note)}
                aria-haspopup="dialog"
                aria-label={t("reader.open", {
                  date: note.date,
                  text: note.text.slice(0, 45),
                })}
                pressEffect={false}
              >
                <span
                  className={`${styles.cover} ${!images.length ? styles.illustrated : ""}`}
                >
                  {images[0] ? (
                    <img
                      src={images[0].assetId}
                      alt={images[0].alt}
                      loading="lazy"
                    />
                  ) : (
                    <CoastalVignette
                      kind={note.sketch}
                      className={styles.coverSketch}
                    />
                  )}
                  {images.length > 0 && (
                    <span className={styles.imageCount}>
                      <Images size={13} />
                      {images.length}
                    </span>
                  )}
                  <span className={styles.openHint}>
                    <ArrowUpRight size={18} />
                  </span>
                </span>
                <span className={styles.meta}>
                  <DateTime value={note.publishedOn} />
                  <span>{note.mood}</span>
                </span>
                <span className={styles.preview}>
                  {note.text.slice(0, 180)}
                  {note.text.length > 180 ? "…" : ""}
                </span>
                <span className={styles.readMore}>
                  {t("readMore")}
                  <ArrowUpRight size={13} />
                </span>
              </Button>
              <div className={styles.cardFooter}>
                <span>{note.tag ? `#${note.tag}` : t("reader.aMoment")}</span>
                <InteractionButton
                  target={{ type: "note", id: note.id }}
                  kind="save"
                  iconOnly
                />
              </div>
            </article>
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
