"use client";
import { useTranslations } from "next-intl";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { Reply } from "lucide-react";
import type { Comment } from "@/modules/engagement/domain/discussion";
import { AuthorNameText } from "@/modules/identity/ui/AuthorSignature";
import { Button } from "@/shared/ui/button/Button";
import { CommentBody } from "./CommentBody";
import styles from "./CommentThread.module.css";
import { Avatar } from "@/shared/ui/avatar/Avatar";

export function CommentItem({
  item,
  nested: isReply,
  onReply,
}: {
  item: Comment;
  nested: boolean;
  onReply: (item: Comment) => void;
}) {
  const t = useTranslations("comments");
  return (
    <article className={`${styles.comment} ${isReply ? styles.nested : ""}`}>
      <Avatar
        className={styles.avatar}
        src={item.avatarUrl}
        name={item.author}
      />
      <div className={styles.commentContent}>
        <div className={styles.meta}>
          <strong>
            <AuthorNameText text={item.author} />
          </strong>
          <DateTime value={item.createdAt} mode="activity" />
        </div>
        {item.replyTo && (
          <span className={styles.replyTo}>
            {t("replyingTo", { name: item.replyTo })}
          </span>
        )}
        <div className={styles.commentBody}>
          <CommentBody comment={item} />
        </div>
        <Button className={styles.replyButton} onClick={() => onReply(item)}>
          <Reply size={13} />
          {t("reply")}
        </Button>
      </div>
    </article>
  );
}
