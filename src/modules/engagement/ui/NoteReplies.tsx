"use client";
import { useTranslations } from "next-intl";
export function NoteReplies() {
  const t = useTranslations("notes.replies");
  return (
    <div className="note-replies">
      <p>{t("unavailable")}</p>
    </div>
  );
}
