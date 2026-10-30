import {
  ArrowUpRight,
  ChevronDown,
  Film,
  Globe2,
  Lightbulb,
  Quote,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ArticleBlock } from "../domain/blocks";
import { CodeCopy } from "./CodeCopy";
import styles from "./blocks.module.css";

function Block({ block }: { block: ArticleBlock }) {
  const t = useTranslations("articleBlocks");
  switch (block.type) {
    case "link":
      return (
        <div className={styles.website}>
          <a
            className={styles.link}
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.siteIcon}>
              <Globe2 size={21} />
            </span>
            <span className={styles.linkText}>
              <small>{block.siteName || new URL(block.url).hostname}</small>
              <strong>{block.title}</strong>
              <span>{block.description}</span>
            </span>
            <ArrowUpRight size={14} />
          </a>
          <details className={styles.preview}>
            <summary>
              {t("preview")}
              <ChevronDown size={12} />
            </summary>
            <div>
              {block.image && (
                <img
                  src={block.image}
                  alt={block.imageAlt || ""}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
              <p>{block.description}</p>
              <a href={block.url} target="_blank" rel="noopener noreferrer">
                {t("visit")}
                <ArrowUpRight size={12} />
              </a>
            </div>
          </details>
        </div>
      );
    case "movie":
      return (
        <a
          className={styles.movie}
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={styles.artwork}>
            {block.artwork ? (
              <img
                src={block.artwork}
                alt={block.artworkAlt || ""}
                loading="lazy"
              />
            ) : (
              <Film size={26} />
            )}
          </span>
          <span className={styles.movieText}>
            <small>
              <Film size={11} />
              {t("film")}
              <i />
              {block.year}
            </small>
            <strong>
              {block.title}
              <ArrowUpRight size={13} />
            </strong>
            {block.originalTitle && <em>{block.originalTitle}</em>}
            <span className={styles.director}>{block.director}</span>
            <span className={styles.note}>{block.note}</span>
          </span>
        </a>
      );
    case "callout":
      return (
        <aside className={styles.callout}>
          {block.tone === "tip" ? <Lightbulb size={16} /> : <Quote size={16} />}
          <div>
            <strong>{block.title}</strong>
            <p>{block.text}</p>
          </div>
        </aside>
      );
    case "code":
      return (
        <figure className={styles.code}>
          <figcaption>
            <span>{block.caption || block.language}</span>
            <CodeCopy code={block.code} />
          </figcaption>
          <pre tabIndex={0} aria-label={block.caption || block.language}>
            <code>{block.code}</code>
          </pre>
        </figure>
      );
  }
}
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className={styles.blocks}>
      {blocks.map((block, index) => (
        <Block key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}
