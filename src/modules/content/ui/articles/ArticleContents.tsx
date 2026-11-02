"use client";
import { Anchor } from "@/shared/ui/link/Anchor";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { CoastGlyph } from "@/shared/ui/drawing/CoastalMarks";
import { HanddrawnTree } from "@/shared/ui/drawing/HanddrawnTree";
import { AnimatedNumber } from "@/shared/ui/typography/AnimatedNumber";
import { useArticleReading } from "./useArticleReading";
import styles from "./ArticleContents.module.css";
const rowHeight = 52;

export function ArticleContents({
  titles,
  label,
}: {
  titles: string[];
  label: string;
}) {
  const { active, percent, started } = useArticleReading();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const navigation = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const condensed = started && !hovered && !focused;
  useEffect(() => {
    const nav = navigation.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link || focused) return;
    if (
      link.offsetTop < nav.scrollTop ||
      link.offsetTop + rowHeight > nav.scrollTop + nav.clientHeight
    )
      nav.scrollTo({
        top: Math.max(0, link.offsetTop - nav.clientHeight / 2),
        behavior: reduced ? "instant" : "smooth",
      });
  }, [active, focused, reduced]);
  if (!titles.length) return null;
  return (
    <aside
      className={styles.contents}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) =>
        setFocused((event.target as HTMLElement).matches(":focus-visible"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <span className={styles.caption}>
        <CoastGlyph kind="tide" />
        {label}
      </span>
      <nav
        ref={navigation}
        className={styles.navigation}
        aria-label={label}
        data-condensed={condensed}
        style={{ "--toc-row-height": `${rowHeight}px` } as CSSProperties}
      >
        <HanddrawnTree
          className={styles.tree}
          count={titles.length}
          active={active}
          expanded={!condensed}
          percent={percent}
          rowHeight={rowHeight}
        />
        <ol className={styles.items}>
          {titles.map((title, index) => (
            <li key={`${index}-${title}`}>
              <Anchor
                className={styles.row}
                href={`#section-${index}`}
                aria-label={`${String(index + 1).padStart(2, "0")} ${title}`}
                aria-current={active === index ? "location" : undefined}
              >
                <span className={styles.number} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.copy} aria-hidden="true">
                  <span className={styles.title}>{title}</span>
                  <span className={styles.progress}>
                    {active === index ? (
                      <>
                        <AnimatedNumber value={percent} />%
                      </>
                    ) : null}
                  </span>
                </span>
              </Anchor>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
