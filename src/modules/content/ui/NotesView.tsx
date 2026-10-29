"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import type { Note } from "../domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { MiniSketch } from "@/components/Sketch";
import { NoteReplies } from "@/modules/engagement/ui/NoteReplies";
import { PageHeading, SpringButton } from "@/shared/ui/primitives";
import { softSpring } from "@/shared/lib/motion";

export function NotesView({ notes }: { notes: Note[] }) {
  const t=useTranslations("notes");
  const [saved, setSaved] = useLocalState<string[]>("adnaan-notes", []);
  const [onlySaved, setOnlySaved] = useState(false);
  return (
    <div className="inner-page">
      <PageHeading
        title={t("title")}
        description={t("description")}
      />
      <div className="notes-toolbar">
        <span className="section-kicker">
          <span />
          {t("year")}
        </span>
        <button
          className={`save-filter ${onlySaved ? "active" : ""}`}
          onClick={() => setOnlySaved((v) => !v)}
          aria-pressed={onlySaved}
        >
          <Heart size={15} />
          {onlySaved ? t("all") : t("saved", {count:saved.length})}
        </button>
      </div>
      <div className="notes-grid">
        {notes
          .filter((n) => !onlySaved || saved.includes(n.id))
          .map((note, i) => (
            <motion.article
              className={`note-card note-${i % 3}`}
              key={note.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...softSpring, delay: i * 0.05 }}
              whileHover={{ y: -5, rotate: i % 2 ? 1 : -1 }}
            >
              <div className="note-top">
                <time>{note.date}</time>
                <span>{note.mood}</span>
              </div>
              <p>{note.text}</p>
              <MiniSketch kind={note.sketch} />
              <div className="note-bottom">
                <span>#{note.tag}</span>
                <SpringButton
                  className={`like-button ${saved.includes(note.id) ? "liked" : ""}`}
                  label={saved.includes(note.id) ? t("unsave") : t("save")}
                  onClick={() =>
                    setSaved((prev) =>
                      prev.includes(note.id)
                        ? prev.filter((id) => id !== note.id)
                        : [...prev, note.id],
                    )
                  }
                >
                  <Heart
                    size={17}
                    fill={saved.includes(note.id) ? "currentColor" : "none"}
                  />
                  <span>{saved.includes(note.id) ? t("savedLabel") : t("remember")}</span>
                </SpringButton>
              </div>
              <NoteReplies />
            </motion.article>
          ))}
      </div>
      {onlySaved && !saved.length && (
        <div className="empty-state">
          <Heart size={28} />
          <p>{t("empty")}</p>
        </div>
      )}
      <p className="end-note">{t("end")}</p>
    </div>
  );
}
