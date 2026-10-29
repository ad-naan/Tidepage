"use client";
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
  const [saved, setSaved] = useLocalState<string[]>("adnaan-notes", []);
  const [onlySaved, setOnlySaved] = useState(false);
  return (
    <div className="inner-page">
      <PageHeading
        title="日子的副本"
        description="把还没写成文章的念头，和不想忘记的瞬间，留在这一页。"
      />
      <div className="notes-toolbar">
        <span className="section-kicker">
          <span />
          2026 年的生活切片
        </span>
        <button
          className={`save-filter ${onlySaved ? "active" : ""}`}
          onClick={() => setOnlySaved((v) => !v)}
          aria-pressed={onlySaved}
        >
          <Heart size={15} />
          {onlySaved ? "查看所有手记" : `收藏的片段 (${saved.length})`}
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
                  label={saved.includes(note.id) ? "取消收藏手记" : "收藏手记"}
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
                  <span>{saved.includes(note.id) ? "已收藏" : "记在心里"}</span>
                </SpringButton>
              </div>
              <NoteReplies />
            </motion.article>
          ))}
      </div>
      {onlySaved && !saved.length && (
        <div className="empty-state">
          <Heart size={28} />
          <p>点击手记里的爱心，收藏打动你的片段。</p>
        </div>
      )}
      <p className="end-note">— 记住这一刻，然后继续生活。—</p>
    </div>
  );
}
