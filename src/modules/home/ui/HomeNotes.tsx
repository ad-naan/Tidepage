import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { NoteListEntry } from "@/modules/content/domain/models";
import { Link } from "@/shared/i18n/navigation";
import { PencilLine, SketchLabel } from "@/shared/ui/drawing/CoastalMarks";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { DateTime } from "@/shared/ui/typography/DateTime";
import styles from "./HomeNotes.module.css";

export function HomeNotes({ notes }: { notes: NoteListEntry[] }) {
  const t = useTranslations("home");
  const reader = useTranslations("notes.reader");
  return (
    <section aria-label={t("note")}>
      <div className="section-heading">
        <h2>
          <SketchLabel kind="leaf">{t("note")}</SketchLabel>
        </h2>
        <Link href="/notes">
          {t("openNotes")} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {notes.length ? (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/notes#note-${encodeURIComponent(note.id)}`}
                className={`article-row ${styles.row}`}
              >
                <DateTime value={note.publishedOn} layout="calendar" />
                <div className={styles.content}>
                  <p className={styles.text}>
                    {note.text.trim()
                      ? `${note.text.trim()}${note.truncated ? "…" : ""}`
                      : reader(note.imageCount ? "photos" : "aMoment")}
                  </p>
                  {note.tag && <span className={styles.tag}>{note.tag}</span>}
                </div>
                <CoastalVignette kind={note.sketch} />
                <PencilLine className="article-shore" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{t("emptyNote")}</p>
      )}
    </section>
  );
}
