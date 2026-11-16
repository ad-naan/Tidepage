"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { taggedUrl, tagLabel } from "@/modules/content/domain/tags";
import { MessageCircle } from "lucide-react";
import type { Note } from "@/modules/content/domain/models";
import { profile } from "@/shared/config/profile";
import { Button } from "@/shared/ui/button/Button";
import { Discussion } from "@/modules/engagement/ui/Discussion";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import { NoteGallery } from "./NoteGallery";
import { EngagementActions } from "@/modules/engagement/ui/EngagementActions";
import styles from "./NoteReader.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { plainTextDocument } from "@/shared/contracts/rich-text";
import { Avatar } from "@/shared/ui/avatar/Avatar";

export function NoteReaderContent({
  note,
  authorAvatar,
}: {
  note: Note;
  authorAvatar: string;
}) {
  const t = useTranslations("notes");
  const { images, body } = note;
  const comments = useRef<HTMLDivElement>(null);
  return (
    <div className={styles.reader}>
      <NoteGallery images={images} note={note} />
      <div className={styles.right}>
        <div
          className={styles.scroll}
          data-custom-scroll={t("reader.readingRegion")}
        >
          <header className={styles.byline}>
            <Avatar
              className={styles.avatar}
              src={authorAvatar}
              name={profile.name}
              size="lg"
            />
            <div>
              <AuthorSignature size="sm" />
              <DateTime value={note.publishedOn} />
            </div>
            <span className={styles.mood}>{note.mood}</span>
          </header>
          <article className={styles.body}>
            {body?.content?.length ? (
              <RichText
                document={body}
                imageDimensions={note.imageDimensions}
              />
            ) : note.text ? (
              <RichText document={plainTextDocument(note.text)} />
            ) : null}
            {note.tag && (
              <Link href={taggedUrl("notes", note.tag)} className={styles.tag}>
                #{tagLabel(note.tag)}
              </Link>
            )}
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
  );
}
