"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import type { Note } from "@/modules/content/domain/models";
import { profile } from "@/shared/config/profile";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { NoteGallery } from "./NoteGallery";
import { EngagementActions } from "@/modules/engagement/ui/EngagementActions";
import styles from "./NoteReader.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { plainTextDocument } from "@/shared/contracts/rich-text";

export function NoteReader({
  note,
  onClose,
}: {
  note: Note;
  onClose: () => void;
}) {
  const t = useTranslations("notes");
  const { images, body } = note;
  const comments = useRef<HTMLDivElement>(null);
  return (
    <Dialog
      title={t("reader.title", { date: note.date })}
      layout="split"
      onClose={onClose}
    >
      <div className={styles.reader}>
        <NoteGallery images={images} note={note} />
        <div className={styles.right}>
          <div
            className={styles.scroll}
            data-custom-scroll={t("reader.readingRegion")}
          >
            <header className={styles.byline}>
              <span className={styles.avatar} aria-hidden>
                {profile.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <AuthorSignature size="sm" />
                <time dateTime={note.publishedOn}>
                  {note.publishedOn.replaceAll("-", ".")}
                </time>
              </div>
              <span className={styles.mood}>{note.mood}</span>
            </header>
            <article className={styles.body}>
              {body?.content?.length ? (
                <RichText document={body} />
              ) : note.text ? (
                <RichText document={plainTextDocument(note.text)} />
              ) : null}
              {note.tag && <span className={styles.tag}>#{note.tag}</span>}
            </article>
            <div ref={comments} className={styles.comments}>
              <Discussion target={{ type: "note", id: note.id }} compact />
            </div>
          </div>
          <footer className={styles.footer}>
            <div className={styles.actions}>
              <EngagementActions target={{ type: "note", id: note.id }} />
              <Button
                className={styles.action}
                onClick={() => {
                  comments.current?.scrollIntoView({
                    behavior: "instant",
                    block: "start",
                  });
                  comments.current
                    ?.querySelector<HTMLElement>('[role="textbox"]')
                    ?.focus({ preventScroll: true });
                }}
              >
                <MessageCircle size={19} />
                {t("reader.comment")}
              </Button>
            </div>
          </footer>
        </div>
      </div>
    </Dialog>
  );
}
