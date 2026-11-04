"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Bookmark, Images } from "lucide-react";
import {
  PencilFrame,
  PencilLine,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import type { Note } from "@/modules/content/domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { NoteReader } from "./NoteReader";
import { notePresentation } from "./note-presentation";
import styles from "./NotesView.module.css";

export function NotesView({ notes }: { notes: Note[] }) {
  const t = useTranslations("notes");
  const feedback = useTranslations("feedback");
  const { notify } = useNotice();
  const [saved, setSaved] = useLocalState<string[]>("adnaan-notes", []);
  const [liked, setLiked] = useLocalState<string[]>("adnaan-note-likes", []);
  const [onlySaved, setOnlySaved] = useState(false);
  const [selected, setSelected] = useState<Note | null>(null);
  const visible = notes.filter((note) => !onlySaved || saved.includes(note.id));
  function toggleSave(id: string) {
    notify({
      title: saved.includes(id) ? feedback("removed") : t("savedLabel"),
      tone: "success",
    });
    setSaved((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  }
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
          onClick={() => setOnlySaved((value) => !value)}
          aria-pressed={onlySaved}
        >
          <Bookmark size={15} />
          {onlySaved
            ? t("all")
            : t("saved", {
                count: notes.filter((note) => saved.includes(note.id)).length,
              })}
          {onlySaved && <HanddrawnMark className={styles.filterMark} />}
        </Button>
        <PencilLine className={styles.shore} />
      </div>
      <div className={styles.grid}>
        {visible.map((note) => {
          const { images } = notePresentation(note);
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
                      src={images[0].src}
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
                  <time dateTime={note.publishedOn}>
                    {note.publishedOn.replaceAll("-", ".")}
                  </time>
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
                <IconButton
                  aria-label={saved.includes(note.id) ? t("unsave") : t("save")}
                  aria-pressed={saved.includes(note.id)}
                  onClick={() => toggleSave(note.id)}
                  className={styles.save}
                >
                  <Bookmark
                    size={17}
                    fill={saved.includes(note.id) ? "currentColor" : "none"}
                  />
                </IconButton>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
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
          saved={saved.includes(selected.id)}
          liked={liked.includes(selected.id)}
          onSave={() => toggleSave(selected.id)}
          onLike={() =>
            setLiked((previous) =>
              previous.includes(selected.id)
                ? previous.filter((id) => id !== selected.id)
                : [...previous, selected.id],
            )
          }
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
