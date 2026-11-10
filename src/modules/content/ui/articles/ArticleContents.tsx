"use client";
import { Anchor } from "@/shared/ui/link/Anchor";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
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
export function ArticleContents({ titles, label, slug, title }: Props) {
  useRegisterReadingArticle(slug, title);
  const t = useTranslations("articles");
  const mobile = useMediaQuery("(max-width: 960px)");
  const [open, setOpen] = useState(false);
  const active = useArticleReadingValue("active");
  const navigation = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!mobile) setOpen(false);
  }, [mobile]);
  useEffect(() => {
    const nav = navigation.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link || mobile || nav.contains(document.activeElement)) return;
    if (
      link.offsetTop < nav.scrollTop ||
      link.offsetTop + rowHeight > nav.scrollTop + nav.clientHeight
    )
      nav.scrollTo({
        top: Math.max(0, link.offsetTop - nav.clientHeight / 2),
        behavior: reduced ? "instant" : "smooth",
      });
  }, [active, mobile, reduced]);
  return (
    <aside className={styles.contents} aria-label={label}>
      {titles.length > 0 && (
        <>
          <span className={styles.caption}>
            <CoastGlyph kind="tide" />
            {label}
          </span>
          <div
            ref={navigation}
            className={styles.navigation}
            style={{ "--toc-row-height": `${rowHeight}px` } as CSSProperties}
          >
            <ContentsTree
              className={styles.tree}
              count={titles.length}
              active={active}
              expanded
              rowHeight={rowHeight}
            />
            <ContentsLinks titles={titles} label={label} active={active} />
          </div>
        </>
      )}
      <ArticleReadingTools
        slug={slug}
        title={title}
        contents={
          titles.length > 0 ? (
            <Button
              className={styles.trigger}
              aria-haspopup="dialog"
              aria-expanded={mobile && open}
              onClick={() => setOpen(true)}
            >
              {t("tocShort")}
            </Button>
          ) : undefined
        }
      />
      {mobile && open && (
        <Dialog title={label} placement="bottom" onClose={() => setOpen(false)}>
          <ContentsLinks
            titles={titles}
            label={label}
            active={active}
            onNavigate={() => setOpen(false)}
          />
        </Dialog>
      )}
    </aside>
  );
}

function ContentsLinks({
  titles,
  label,
  active,
  onNavigate,
}: Pick<Props, "titles" | "label"> & {
  active: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className={onNavigate ? styles.sheet : undefined} aria-label={label}>
      <ol className={styles.items}>
        {titles.map((chapter, index) => {
          const number = String(index + 1).padStart(2, "0");
          const current = active === index;
          return (
            <li key={`${index}-${chapter}`}>
              <Anchor
                className={styles.row}
                href={`#section-${index}`}
                aria-label={`${number} ${chapter}`}
                aria-current={current ? "location" : undefined}
                data-dialog-initial-focus={
                  onNavigate && current ? "" : undefined
                }
                onClick={onNavigate}
              >
                <span className={styles.number} aria-hidden="true">
                  {number}
                </span>
                <span className={styles.title}>{chapter}</span>
              </Anchor>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ContentsTree(
  props: Omit<Parameters<typeof HanddrawnTree>[0], "percent">,
) {
  const percent = useArticleReadingValue("percent");
  return <HanddrawnTree {...props} percent={percent} />;
}
