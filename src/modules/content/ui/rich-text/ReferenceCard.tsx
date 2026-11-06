import { ArrowUpRight, Film, Globe2, Music2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import {
  embedSchema,
  type Embed,
} from "@/modules/content/domain/editor-document";
import styles from "./ReferenceCard.module.css";

export function ReferenceCard({ value }: { value: Embed }) {
  const t = useTranslations("articleBlocks");
  const result = embedSchema.safeParse(value);
  if (!result.success) return null;
  const card = result.data;
  const Icon =
    card.kind === "movie" ? Film : card.kind === "music" ? Music2 : Globe2;
  const artwork = /^\/(?!\/)[^\\]*$/.test(card.artworkAssetId)
    ? card.artworkAssetId
    : card.artworkUrl;
  return (
    <ExternalLink href={card.url} className={styles.card} data-kind={card.kind}>
      <span className={styles.artwork}>
        {artwork ? (
          <img
            src={artwork}
            alt={card.artworkAlt || ""}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Icon size={24} strokeWidth={1.2} />
        )}
      </span>
      <span className={styles.body}>
        <small className={styles.meta}>
          <Icon size={12} aria-hidden="true" />
          {card.siteName || t(card.kind)}
          {card.year && <span>· {card.year}</span>}
        </small>
        <strong>{card.title}</strong>
        {card.originalTitle && <em>{card.originalTitle}</em>}
        {(card.creator || card.album) && (
          <span className={styles.creator}>
            {[card.creator, card.album].filter(Boolean).join(" · ")}
          </span>
        )}
        {card.description && (
          <span className={styles.description}>{card.description}</span>
        )}
        <small className={styles.host}>{new URL(card.url).hostname}</small>
      </span>
      <ArrowUpRight size={15} className={styles.arrow} aria-hidden="true" />
    </ExternalLink>
  );
}
