"use client";
import {
  PencilFrame,
  PencilLine,
  SketchLabel,
} from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { ContentHeading } from "@/modules/content/ui/layout/ContentHeading";
import styles from "./NotesView.module.css";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import type { Note } from "@/modules/content/domain/models";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { CoastalVignette } from "@/shared/ui/illustration/CoastalVignette";
import { NoteReplies } from "@/modules/engagement/ui/NoteReplies";
import { Button } from "@/shared/ui/button/Button";
import { softSpring } from "@/shared/lib/motion";

export function NotesView({ notes }: { notes: Note[] }) {
  const t = useTranslations("notes");
  const feedback = useTranslations("feedback");
  const { notify } = useNotice();
  const [saved, setSaved] = useLocalState<string[]>("adnaan-notes", []);
  const [onlySaved, setOnlySaved] = useState(false);
  return (
    <div className={`inner-page ${styles.notes}`}>
      <ContentHeading
        room="notes"
        title={t("title")}
        description={t("description")}
      />
      <div className="notes-toolbar">
        <SketchLabel kind="leaf">{t("year")}</SketchLabel>
        <Button
          className={`save-filter ${onlySaved ? "active" : ""}`}
          onClick={() => setOnlySaved((v) => !v)}
          aria-pressed={onlySaved}
        >
          <Heart size={15} />
          {onlySaved ? t("all") : t("saved", { count: saved.length })}
          {onlySaved && <HanddrawnMark className="saved-filter-mark" />}
        </Button>
        <PencilLine className="toolbar-shore" />
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
              whileHover={{ y: -3, rotate: i % 2 ? 0.35 : -0.35 }}
            >
              <PencilFrame kind="note" />
              <div className="note-top">
                <time>{note.date}</time>
                <span>{note.mood}</span>
              </div>
              <p>{note.text}</p>
              <CoastalVignette kind={note.sketch} />
              <div className="note-bottom">
                <PencilLine kind="fold" className="note-fold" />
                <span>#{note.tag}</span>
                <Button
                  className={`like-button ${saved.includes(note.id) ? "liked" : ""}`}
                  aria-label={saved.includes(note.id) ? t("unsave") : t("save")}
                  onClick={() => {
                    notify({
                      title: saved.includes(note.id)
                        ? feedback("removed")
                        : t("savedLabel"),
                      tone: "success",
                    });
                    setSaved((prev) =>
                      prev.includes(note.id)
                        ? prev.filter((id) => id !== note.id)
                        : [...prev, note.id],
                    );
                  }}
                >
                  <Heart
                    size={17}
                    fill={saved.includes(note.id) ? "currentColor" : "none"}
                  />
                  <span>
                    {saved.includes(note.id) ? t("savedLabel") : t("remember")}
                  </span>
                </Button>
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
      <p className="end-note">
        <SketchLabel kind="tide">{t("end")}</SketchLabel>
      </p>
    </div>
  );
}
