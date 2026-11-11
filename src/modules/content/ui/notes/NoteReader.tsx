"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { Note, NoteListEntry } from "@/modules/content/domain/models";
import { apiGet } from "@/shared/http/client";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { LoadingSkeleton } from "@/shared/ui/loading/LoadingSkeleton";
import { ImageFrame } from "@/shared/ui/image/MediaImage";
import { DateTime } from "@/shared/ui/typography/DateTime";
import styles from "./NoteReader.module.css";

type LoadedReader = {
  note: Note;
  Content: typeof import("./NoteReaderContent").NoteReaderContent;
};

/** Keep the dialog mounted while its data and reading tools load together. */
export function NoteReader({
  note,
  onClose,
}: {
  note: Note | NoteListEntry;
  onClose: () => void;
}) {
  const t = useTranslations("notes");
  const [loaded, setLoaded] = useState<LoadedReader | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ id: note.id, locale: note.locale });
    void Promise.all([
      "images" in note
        ? Promise.resolve(note)
        : apiGet<Note>(`/api/v1/notes?${query}`, { signal: controller.signal }),
      import("./NoteReaderContent"),
    ]).then(
      ([fullNote, { NoteReaderContent }]) => {
        if (!controller.signal.aborted)
          setLoaded({ note: fullNote, Content: NoteReaderContent });
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [note, attempt]);

  const cover = "images" in note ? note.images[0] : note.cover;
  return (
    <Dialog
      title={t("reader.title", { date: note.date })}
      layout="split"
      onClose={onClose}
    >
      {loaded ? (
        <loaded.Content note={loaded.note} />
      ) : (
        <div className={styles.reader}>
          <div className={styles.pendingGallery}>
            {cover && (
              <ImageFrame
                src={cover.assetId}
                alt={cover.alt}
                fit="contain"
                sizes="(max-width: 700px) 90vw, 600px"
              />
            )}
          </div>
          <div className={styles.right}>
            <div className={styles.scroll}>
              <div className={styles.byline}>
                <DateTime value={note.publishedOn} />
                <span className={styles.mood}>{note.mood}</span>
              </div>
              {failed ? (
                <div className={styles.loadError}>
                  <p role="alert">{t("reader.loadError")}</p>
                  <Button
                    variant="quiet"
                    onClick={() => {
                      setFailed(false);
                      setAttempt((value) => value + 1);
                    }}
                  >
                    {t("reader.retry")}
                  </Button>
                </div>
              ) : (
                <LoadingSkeleton variant="document" />
              )}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
