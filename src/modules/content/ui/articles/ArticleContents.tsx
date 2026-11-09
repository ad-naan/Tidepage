"use client";
import { Anchor } from "@/shared/ui/link/Anchor";
import { useEffect, useRef, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { CoastGlyph } from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnTree } from "@/shared/ui/drawing/HanddrawnTree";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { useArticleReadingValue } from "./useArticleReading";
import { ArticleReadingTools } from "./ArticleReadingTools";
import { useRegisterReadingArticle } from "./ReadingArticleContext";
import styles from "./ArticleContents.module.css";
const rowHeight = 44;
type Props = {
  titles: string[];
  label: string;
  slug: string;
  title: string;
};
export function ArticleContents(props: Props) {
  useRegisterReadingArticle(props.slug, props.title);
  const visible = useMediaQuery("(width > 960px)", true);
  return visible ? <ContentsAside {...props} /> : null;
}
function ContentsAside({ titles, label, slug, title }: Props) {
  const active = useArticleReadingValue("active");
  const navigation = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const nav = navigation.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link || nav.contains(document.activeElement)) return;
    if (
      link.offsetTop < nav.scrollTop ||
      link.offsetTop + rowHeight > nav.scrollTop + nav.clientHeight
    )
      nav.scrollTo({
        top: Math.max(0, link.offsetTop - nav.clientHeight / 2),
        behavior: reduced ? "instant" : "smooth",
      });
  }, [active, reduced]);
  return (
    <aside className={styles.contents} aria-label={label}>
      {titles.length > 0 && (
        <>
          <span className={styles.caption}>
            <CoastGlyph kind="tide" />
            {label}
          </span>
          <nav
            ref={navigation}
            className={styles.navigation}
            aria-label={label}
            style={{ "--toc-row-height": `${rowHeight}px` } as CSSProperties}
          >
            <ContentsTree
              className={styles.tree}
              count={titles.length}
              active={active}
              expanded
              rowHeight={rowHeight}
            />
            <ol className={styles.items}>
              {titles.map((chapter, index) => (
                <li key={`${index}-${chapter}`}>
                  <Anchor
                    className={styles.row}
                    href={`#section-${index}`}
                    aria-label={`${String(index + 1).padStart(2, "0")} ${chapter}`}
                    aria-current={active === index ? "location" : undefined}
                  >
                    <span className={styles.number} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.title}>{chapter}</span>
                  </Anchor>
                </li>
              ))}
            </ol>
          </nav>
        </>
      )}
      <ArticleReadingTools slug={slug} title={title} />
    </aside>
  );
}

function ContentsTree(
  props: Omit<Parameters<typeof HanddrawnTree>[0], "percent">,
) {
  const percent = useArticleReadingValue("percent");
  return <HanddrawnTree {...props} percent={percent} />;
}
