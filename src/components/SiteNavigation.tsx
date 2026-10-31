"use client";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { navigationItems } from "@/shared/config/site";
import type {
  ArticleSummary,
  NavigationOverview,
} from "@/modules/content/domain/models";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { OverlayScope } from "@/shared/ui/OverlayScope";
import { AnchoredPanel } from "@/shared/ui/AnchoredPanel";
import { HanddrawnMark } from "@/shared/ui/HanddrawnMark";
import styles from "./SiteNavigation.module.css";

const primaryKeys = new Set(["articles", "notes", "projects"]);
const primary = navigationItems.filter((item) => primaryKeys.has(item.key));
const secondary = navigationItems.filter(
  (item) => item.key !== "home" && !primaryKeys.has(item.key),
);
type Preview = "articles" | "notes" | "projects";
type Mode = Preview | "more";
const widths: Record<Mode, number> = {
  articles: 350,
  notes: 310,
  projects: 320,
  more: 190,
};

export function SiteNavigation({
  articles,
  content,
  boundary,
  onNavigate,
}: {
  articles: ArticleSummary[];
  content: NavigationOverview;
  boundary: RefObject<HTMLElement | null>;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const sky = useTranslations("celestial");
  const pathname = usePathname();
  const { open, setOpen, ref } = useDisclosure("site-navigation");
  const trigger = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [mode, setMode] = useState<Mode>("more");
  const intent = useRef<"hover" | "click">("hover");
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusNext = useRef(false);
  const id = useId();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const moreActive = secondary.some((item) => isActive(item.href));
  function cancelClose() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }
  function clearTimers() {
    cancelClose();
    if (enterTimer.current) clearTimeout(enterTimer.current);
  }
  function reveal(next: Mode, element: HTMLElement, keyboard = false) {
    clearTimers();
    focusNext.current = keyboard;
    setMode(next);
    setAnchor(element);
    setOpen(true);
    window.dispatchEvent(
      new CustomEvent("garden-disclosure", { detail: "site-navigation" }),
    );
  }
  function hover(next: Mode, element: HTMLElement) {
    if (open && mode === next && intent.current === "click") return;
    clearTimers();
    enterTimer.current = setTimeout(() => {
      intent.current = "hover";
      reveal(next, element);
    }, 200);
  }
  function leave() {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (intent.current === "click") return;
    cancelClose();
    leaveTimer.current = setTimeout(() => setOpen(false), 180);
  }
  function navigate() {
    clearTimers();
    setOpen(false);
    onNavigate?.();
  }
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (!open || !focusNext.current) return;
    focusNext.current = false;
    [
      ...(document
        .getElementById(id)
        ?.querySelectorAll<HTMLAnchorElement>("a") ?? []),
    ]
      .find((link) => link.getClientRects().length > 0)
      ?.focus({ preventScroll: true });
  }, [open, mode, id]);
  return (
    <OverlayScope owner="site-navigation">
      <nav
        className={styles.navigation}
        aria-label={sky("main")}
        ref={ref}
        onPointerLeave={leave}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            clearTimers();
            setOpen(false);
          }
        }}
      >
        <div className={styles.primary}>
          {primary.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              aria-expanded={open && mode === item.key}
              aria-controls={id}
              aria-keyshortcuts="ArrowDown"
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch")
                  hover(item.key as Preview, event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  intent.current = "click";
                  reveal(item.key as Preview, event.currentTarget, true);
                }
              }}
              onClick={navigate}
            >
              {t(item.key)}
              <HanddrawnMark className={styles.mark} />
            </Link>
          ))}
        </div>
        <button
          ref={trigger}
          className={styles.more}
          onPointerEnter={(event) => {
            if (event.pointerType !== "touch")
              hover("more", event.currentTarget);
          }}
          onClick={(event) => {
            clearTimers();
            if (open && mode === "more" && intent.current === "click") {
              setOpen(false);
              return;
            }
            intent.current = "click";
            reveal("more", event.currentTarget, true);
          }}
          aria-expanded={open && mode === "more"}
          aria-controls={id}
          data-active={moreActive}
        >
          <span className={styles.desktopLabel}>{t("more")}</span>
          <span className={styles.mobileLabel}>{t("browse")}</span>
          <ChevronDown
            className={styles.chevron}
            size={11}
            aria-hidden="true"
          />
          <HanddrawnMark className={styles.mark} />
        </button>
        <AnchoredPanel
          id={id}
          open={open}
          anchor={anchor}
          boundary={boundary}
          width={widths[mode]}
          label={t(`preview.${mode}.title`)}
          className={`${styles.dropdown} ${mode !== "more" ? styles.preview : ""}`}
          onPointerEnter={cancelClose}
          onPointerLeave={leave}
        >
          {mode === "more" && (
            <>
              {primary.map((item) => (
                <Link
                  key={item.key}
                  className={styles.mobileItem}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={navigate}
                >
                  {t(item.key)}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              ))}
              {secondary.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={navigate}
                >
                  {t(item.key)}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              ))}
            </>
          )}
          {mode !== "more" && (
            <>
              <div className={styles.previewHeading}>
                <span>{t(`preview.${mode}.title`)}</span>
                <span aria-hidden="true">✳</span>
              </div>
              {mode === "articles" && (
                <div className={styles.previewArticles}>
                  {articles.slice(0, 2).map((article) => (
                    <Link
                      key={article.slug}
                      href={`/articles/${article.slug}`}
                      onClick={navigate}
                    >
                      <small>{article.date.slice(5).replace("-", "/")}</small>
                      <span>{article.title}</span>
                    </Link>
                  ))}
                  {!articles.length && <p>{t("preview.empty")}</p>}
                </div>
              )}
              {mode === "notes" && (
                <div className={styles.previewNote}>
                  {content.note && (
                    <>
                      <p>{content.note.text}</p>
                      <small>
                        {content.note.date} · {content.note.mood}
                      </small>
                    </>
                  )}
                  {!content.note && <p>{t("preview.empty")}</p>}
                </div>
              )}
              {mode === "projects" && (
                <div className={styles.previewProjects}>
                  {content.projects.map((project) => (
                    <div key={project.id}>
                      <strong>{project.name}</strong>
                      <span>{project.subtitle}</span>
                    </div>
                  ))}
                  {!content.projects.length && <p>{t("preview.empty")}</p>}
                </div>
              )}
              <Link
                className={styles.previewAll}
                href={`/${mode}`}
                onClick={navigate}
              >
                {t(`preview.${mode}.open`)}
                <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </>
          )}
        </AnchoredPanel>
      </nav>
    </OverlayScope>
  );
}
