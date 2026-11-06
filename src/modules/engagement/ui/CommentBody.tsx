"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Comment } from "@/modules/engagement/domain/discussion";
import { plainTextDocument } from "@/shared/contracts/rich-text";
import { Disclosure } from "@/shared/ui/disclosure/Disclosure";
import { RichText } from "@/modules/content/ui/rich-text/RichText";
import styles from "./CommentThread.module.css";

export function CommentBody({ comment }: { comment: Comment }) {
  const t = useTranslations("comments");
  const [open, setOpen] = useState(false);
  const long =
    comment.body.length > 600 || comment.body.split("\n").length > 10;
  const body = () => (
    <RichText
      document={comment.document ?? plainTextDocument(comment.body)}
      compact
    />
  );
  if (!long) return body();
  return (
    <Disclosure
      className={styles.longComment}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      summary={
        <>
          <span className={styles.excerpt}>{comment.body.slice(0, 180)}…</span>
          <span className={styles.expandLabel}>
            {t(open ? "collapse" : "expand")}
          </span>
        </>
      }
    >
      {open && body()}
    </Disclosure>
  );
}
