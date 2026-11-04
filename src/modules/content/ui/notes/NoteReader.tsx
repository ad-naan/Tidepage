"use client";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, Heart, MessageCircle } from "lucide-react";
import type { Note } from "@/modules/content/domain/models";
import { profile } from "@/shared/config/profile";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Button } from "@/shared/ui/button/Button";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { NoteGallery } from "./NoteGallery";
import { notePresentation } from "./note-presentation";
import styles from "./NoteReader.module.css";

export function NoteReader({
  note,
  saved,
  liked,
  onSave,
  onLike,
  onClose,
}: {
  note: Note;
  saved: boolean;
  liked: boolean;
  onSave: () => void;
  onLike: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("notes");
  const { images, body } = notePresentation(note);
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
                <strong>{profile.name}</strong>
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
                <p>{note.text}</p>
              ) : null}
              {note.tag && <span className={styles.tag}>#{note.tag}</span>}
            </article>
            <div ref={comments} className={styles.comments}>
              <Discussion target={{ type: "note", id: note.id }} compact />
            </div>
          </div>
          <footer className={styles.footer}>
            <div className={styles.actions}>
              <Button
                aria-pressed={liked}
                onClick={onLike}
                className={styles.action}
              >
                <Heart size={19} fill={liked ? "currentColor" : "none"} />
                {t(liked ? "reader.liked" : "reader.like")}
              </Button>
              <Button
                aria-pressed={saved}
                onClick={onSave}
                className={styles.action}
              >
                <Bookmark size={19} fill={saved ? "currentColor" : "none"} />
                {t(saved ? "savedLabel" : "reader.save")}
              </Button>
              <Button
                className={styles.action}
                onClick={() => {
                  comments.current?.scrollIntoView({
                    behavior: "instant",
                    block: "start",
                  });
                  comments.current
                    ?.querySelector<HTMLTextAreaElement>("textarea")
                    ?.focus({ preventScroll: true });
                }}
              >
                <MessageCircle size={19} />
                {t("reader.comment")}
              </Button>
            </div>
            <p>{t("reader.localActions")}</p>
          </footer>
        </div>
      </div>
    </Dialog>
  );
}
