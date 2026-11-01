import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FriendLink } from "@/modules/friends/domain/models";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import { CoastGlyph, PencilFrame } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./FriendsView.module.css";

export function FriendCard({
  friend,
  preview,
}: {
  friend: FriendLink;
  preview: boolean;
}) {
  const t = useTranslations("friends");
  const content = (
    <>
      <PencilFrame kind="note" />
      <div className={styles.cardTop}>
        <span className={styles.avatar} data-category={friend.category}>
          <CoastGlyph
            kind={
              friend.category === "technology"
                ? "tide"
                : friend.category === "design"
                  ? "wind"
                  : "leaf"
            }
          />
        </span>
        <span className={styles.category}>
          {t(`categories.${friend.category}`)}
        </span>
        {!preview && <ArrowUpRight size={15} aria-hidden="true" />}
      </div>
      <h3>{friend.name}</h3>
      <p>{friend.description}</p>
      <span className={styles.address}>
        {preview ? t("sampleCard") : new URL(friend.url).hostname}
      </span>
    </>
  );
  return (
    <li className={styles.card}>
      {preview ? (
        <div className={styles.cardBody}>{content}</div>
      ) : (
        <ExternalLink className={styles.cardBody} href={friend.url}>
          {content}
        </ExternalLink>
      )}
    </li>
  );
}
