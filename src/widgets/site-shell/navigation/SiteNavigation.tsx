"use client";
import { DateTime } from "@/shared/ui/typography/DateTime";
import { Button } from "@/shared/ui/button/Button";
import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { navigationItems } from "@/shared/config/site";
import type {
  ArticleSummary,
  NavigationOverview,
} from "@/modules/content/domain/models";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import { CoastGlyph, PencilLine } from "@/shared/ui/drawing/CoastalMarks";
import styles from "./SiteNavigation.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";

const primaryKeys = new Set(["articles", "notes", "projects"]);
type Preview = "articles" | "notes" | "projects";
type Mode = Preview | "home" | "more";
const motifs = {
  home: "shell",
  articles: "leaf",
  notes: "tide",
  projects: "wind",
  more: "shell",
} as const;
const widths: Record<Mode, number> = {
  home: 400,
  articles: 420,
  notes: 360,
  projects: 360,
  more: 260,
};

export function SiteNavigation({
  articles,
  content,
  boundary,
  onNavigate,
  items = navigationItems,
}: {
  articles: ArticleSummary[];
  content: NavigationOverview;
  boundary: RefObject<HTMLElement | null>;
  onNavigate?: () => void;
  items?: readonly (typeof navigationItems)[number][];
}) {
  const primary = items.filter((item) => primaryKeys.has(item.key));
  const secondary = items.filter(
    (item) =>
      !["home", "about", "site"].includes(item.key) &&
      !primaryKeys.has(item.key),
  );
  const homePages = items.filter((item) =>
    ["home", "about", "site"].includes(item.key),
  );
  const t = useTranslations("nav");
  const sky = useTranslations("celestial");
  const pathname = usePathname();
  const reduced = useReducedMotion();
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
  const homeActive = ["/", "/about", "/site"].includes(pathname);
  const homeLabel =
    homePages.find((item) => isActive(item.href))?.key ?? "home";
  const moreLabel =
    secondary.find((item) => isActive(item.href))?.key ?? "more";
  const mobileLabel =
    navigationItems.find((item) => isActive(item.href))?.key ?? "browse";
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
    clearTimers();
    if (open && mode === next) return;
    enterTimer.current = setTimeout(
      () => {
        intent.current = "hover";
        reveal(next, element);
      },
      open ? 70 : 160,
    );
  }
  function leave() {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    if (intent.current === "click") return;
    cancelClose();
    leaveTimer.current = setTimeout(() => {
      if (!document.getElementById(id)?.contains(document.activeElement))
        setOpen(false);
    }, 260);
  }
  function navigate() {
    clearTimers();
    setOpen(false);
    onNavigate?.();
  }
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    clearTimers();
  }, [pathname]);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (
        event.type === "garden-disclosure" &&
        (event as CustomEvent).detail === "site-navigation"
      )
        return;
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof PointerEvent &&
        event.target instanceof Node &&
        (ref.current?.contains(event.target) ||
          document.getElementById(id)?.contains(event.target))
      )
        return;
      clearTimers();
    };
    window.addEventListener("garden-disclosure", dismiss);
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      clearTimers();
      window.removeEventListener("garden-disclosure", dismiss);
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [id]);
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
        onBlurCapture={(event) => {
          const next = event.relatedTarget;
          if (
            next instanceof Node &&
            !ref.current?.contains(next) &&
            !document.getElementById(id)?.contains(next)
          ) {
            clearTimers();
            setOpen(false);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            clearTimers();
            setOpen(false);
          }
        }}
      >
        <div className={styles.primary}>
          <div className={styles.homeEntry}>
            <Link
              href="/"
              data-active={homeActive}
              aria-current={pathname === "/" ? "page" : undefined}
              aria-expanded={open && mode === "home"}
              aria-controls={id}
              aria-keyshortcuts="ArrowDown"
              onPointerEnter={(event) => {
                if (event.pointerType !== "touch")
                  hover("home", event.currentTarget);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  intent.current = "click";
                  reveal("home", event.currentTarget, true);
                }
              }}
              onClick={navigate}
            >
              {t(homeLabel)}
              <HanddrawnMark className={styles.mark} />
            </Link>
            <Button
              className={styles.homeToggle}
              aria-label={t("homeMenu")}
              aria-expanded={open && mode === "home"}
              aria-controls={id}
              onClick={(event) => {
                if (open && mode === "home" && intent.current === "click") {
                  setOpen(false);
                  return;
                }
                intent.current = "click";
                reveal("home", event.currentTarget, true);
              }}
            >
              <ChevronDown size={10} aria-hidden="true" />
            </Button>
          </div>
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
        <Button
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
          <span className={styles.desktopLabel}>{t(moreLabel)}</span>
          <span className={styles.mobileLabel}>{t(mobileLabel)}</span>
          <ChevronDown
            className={styles.chevron}
            size={11}
            aria-hidden="true"
          />
          <HanddrawnMark className={styles.mark} />
        </Button>
        <AnchoredPanel
          id={id}
          open={open}
          anchor={anchor}
          boundary={boundary}
          align="center"
          gap={6}
          surfaceStyle="paper"
          animateLayout
          width={widths[mode]}
          label={t(`preview.${mode}.title`)}
          className={`${styles.dropdown} ${mode !== "more" ? styles.preview : ""}`}
          onPointerEnter={clearTimers}
          onPointerLeave={leave}
          onFocusCapture={cancelClose}
        >
          <motion.div
            key={mode}
            className={styles.panelContent}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className={styles.previewHeading}>
              <CoastGlyph kind={motifs[mode]} className={styles.headingGlyph} />
              <span>{t(`preview.${mode}.title`)}</span>
            </div>
            {mode === "more" && (
              <div className={styles.moreLinks}>
                {homePages.map((item) => (
                  <Link
                    className={styles.mobileItem}
                    href={item.href}
                    key={item.key}
                    onClick={navigate}
                    aria-current={isActive(item.href) ? "page" : undefined}
                  >
                    <span className={styles.itemLabel}>
                      {t(item.key)}
                      <HanddrawnMark className={styles.itemMark} />
                    </span>
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                ))}
                {primary.map((item) => (
                  <Link
                    key={item.key}
                    className={styles.mobileItem}
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    onClick={navigate}
                  >
                    <span className={styles.itemLabel}>
                      {t(item.key)}
                      <HanddrawnMark className={styles.itemMark} />
                    </span>
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
                    <span className={styles.itemLabel}>
                      {t(item.key)}
                      <HanddrawnMark className={styles.itemMark} />
                    </span>
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
            {mode === "home" && (
              <div className={styles.homePreview}>
                <div className={styles.homeIntro}>
                  <AuthorSignature size="sm" />
                  <p>{t("homeDescription")}</p>
                </div>
                <PencilLine className={styles.separator} />
                <div className={styles.homeLinks}>
                  <Link
                    href="/about"
                    onClick={navigate}
                    aria-current={pathname === "/about" ? "page" : undefined}
                  >
                    <span>
                      {t("homeAbout")}
                      <small>{t("homeAboutDescription")}</small>
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                  <Link
                    href="/site"
                    onClick={navigate}
                    aria-current={pathname === "/site" ? "page" : undefined}
                  >
                    <span>
                      {t("homeSite")}
                      <small>{t("homeSiteDescription")}</small>
                    </span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </Link>
                </div>
                <PencilLine kind="trail" className={styles.separator} />
                <Link className={styles.homeBack} href="/" onClick={navigate}>
                  {t("homeBack")}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              </div>
            )}
            {mode !== "more" && mode !== "home" && (
              <>
                {mode === "articles" && (
                  <div className={styles.previewArticles}>
                    {articles.slice(0, 3).map((article) => (
                      <Link
                        key={article.slug}
                        href={`/articles/${article.slug}`}
                        onClick={navigate}
                      >
                        <span>{article.title}</span>
                        <small>
                          <DateTime value={article.date} />
                        </small>
                      </Link>
                    ))}
                    {!articles.length && <p>{t("preview.empty")}</p>}
                  </div>
                )}
                {mode === "notes" && (
                  <div className={styles.previewNote}>
                    {content.note && (
                      <>
                        <div className={styles.noteMeta}>
                          <span>{content.note.date}</span>
                          {content.note.mood && (
                            <span className={styles.mood}>
                              {content.note.mood}
                            </span>
                          )}
                        </div>
                        <p>{content.note.text}</p>
                      </>
                    )}
                    {!content.note && <p>{t("preview.empty")}</p>}
                  </div>
                )}
                {mode === "projects" && (
                  <div className={styles.previewProjects}>
                    {content.projects.map((project) => (
                      <Link
                        href="/projects"
                        onClick={navigate}
                        key={project.id}
                      >
                        <strong>{project.name}</strong>
                        <span>{project.subtitle}</span>
                      </Link>
                    ))}
                    {!content.projects.length && <p>{t("preview.empty")}</p>}
                  </div>
                )}
                <PencilLine kind="trail" className={styles.separator} />
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
          </motion.div>
        </AnchoredPanel>
      </nav>
    </OverlayScope>
  );
}
