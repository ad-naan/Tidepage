import { ArrowUpRight, Film, Globe2, Music2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ExternalLink } from "@/shared/ui/link/Anchor";
import {
  embedSchema,
  type Embed,
} from "@/modules/content/domain/editor-document";
import styles from "./ReferenceCard.module.css";
import { ReferenceArtwork } from "./ReferenceArtwork";

export function ReferenceCard({
  value,
  compact = false,
}: {
  value: Embed;
  compact?: boolean;
}) {
  const t = useTranslations("articleBlocks");
  const result = embedSchema.safeParse(value);
  if (!result.success) return null;
  const card = result.data;
  const Icon =
    card.kind === "movie" ? Film : card.kind === "music" ? Music2 : Globe2;
  const artwork = /^\/(?!\/)[^\\]*$/.test(card.artworkAssetId)
    ? card.artworkAssetId
    : card.artworkUrl;
  const url = new URL(card.url);
  const source = card.siteName || url.hostname;
  const address =
    card.kind !== "web" && source !== url.hostname
      ? `${source} · ${url.hostname}`
      : url.hostname +
        (card.title === url.hostname && url.pathname !== "/"
          ? url.pathname
          : "");
  return (
    <ExternalLink
      href={card.url}
      preview={false}
      className={styles.card}
      data-kind={card.kind}
      data-compact={compact}
    >
      <span className={styles.artwork}>
        <ReferenceArtwork
          src={artwork}
          alt={card.artworkAlt || ""}
          fallback={<Icon size={24} strokeWidth={1.2} aria-hidden />}
        />
      </span>
      <span className={styles.body}>
        <small className={styles.meta}>
          <Icon size={12} aria-hidden="true" />
          {card.kind === "web" && source !== url.hostname
            ? source
            : t(card.kind)}
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
        {address !== card.title && (
          <small className={styles.host}>{address}</small>
        )}
      </span>
      <ArrowUpRight size={15} className={styles.arrow} aria-hidden="true" />
    </ExternalLink>
  );
}
