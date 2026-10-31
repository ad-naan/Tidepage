"use client";
import { useTranslations } from "next-intl";
import { AnchoredPanel } from "@/shared/ui/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/OverlayScope";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/shared/i18n/navigation";
import { usePathname } from "@/shared/i18n/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import {
  ArrowRight,
  ChevronDown,
  Code2,
  Command,
  Focus,
  Search,
  X,
} from "lucide-react";
import type {
  ArticleSummary,
  NavigationOverview,
} from "@/modules/content/domain/models";
import { useArticleSearch } from "@/modules/content/ui/useArticleSearch";
import { spring } from "@/shared/lib/motion";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { LoginTrigger } from "@/modules/identity/ui/PreviewIdentity";
import { ActivityDetails } from "./ActivityDetails";
import { MusicPlayer } from "./MusicPlayer";
import { SiteNavigation } from "./SiteNavigation";
import { HeaderBrand } from "./HeaderBrand";
import { HeaderSky } from "./HeaderSky";
import { ReadingProgress } from "./ReadingProgress";

const surfaces = {
  activity: {
    selector: ".living-activity-trigger",
    width: 390,
    align: "start",
  },
  search: { selector: ".living-search-trigger", width: 480, align: "end" },
  music: { selector: ".music-open", width: 620, align: "end" },
} as const;
type HeaderPanel = keyof typeof surfaces;
type Props = {
  articles: ArticleSummary[];
  navigation: NavigationOverview;
  label: string;
  immersive: boolean;
  onImmersiveChange: () => void;
};

export function SiteHeader({
  articles,
  navigation,
  label,
  immersive,
  onImmersiveChange,
}: Props) {
  const t = useTranslations("header"),
    categories = useTranslations("categories");
  const pathname = usePathname();
  const { open, setOpen, ref } = useDisclosure("header");
  const [panel, setPanel] = useState<HeaderPanel>("activity");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [musicContainer, setMusicContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const condensed = compact || immersive;
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const article = pathname.startsWith("/articles/")
    ? articles.find((a) => pathname.endsWith(a.slug))
    : undefined;
  const reading = !!article && condensed;
  const search = useArticleSearch(query, open && panel === "search", articles);
  const results = search.items;

  useMotionValueEvent(scrollY, "change", (value) => {
    // Hysteresis prevents the header from flickering around a single threshold.
    if (value > 88) setCompact(true);
    else if (value < 40) setCompact(false);
  });
  useEffect(() => {
    setCompact(window.scrollY > 88);
  }, [pathname]);

  const show = (next: HeaderPanel) => {
    window.dispatchEvent(
      new CustomEvent("garden-disclosure", { detail: "header" }),
    );
    setAnchor(
      ref.current?.querySelector<HTMLElement>(surfaces[next].selector) ?? null,
    );
    setPanel(next);
    setOpen((current) => (panel === next ? !current : true));
  };
  useEffect(() => {
    if (open && panel === "search")
      input.current?.focus({ preventScroll: true });
  }, [open, panel]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent("garden-disclosure", { detail: "header" }),
        );
        setAnchor(trigger.current);
        setPanel("search");
        setOpen((value) => (panel === "search" ? !value : true));
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [open, panel, setOpen]);

  return (
    <OverlayScope owner="header">
      <div className="header-slot" ref={ref}>
        <header
          ref={header}
          aria-label={t("tools", { label })}
          className={`living-header sky-header ${condensed ? "is-compact" : "is-resting"} ${reading ? "is-reading" : ""}`}
          data-state={
            open
              ? panel
              : reading
                ? "reading"
                : condensed
                  ? "compact"
                  : "resting"
          }
        >
          <HeaderSky />
          <div className="living-header-row">
            <div className="header-identity-group">
              <HeaderBrand compact={condensed} />
              <div className="living-context">
                <AnimatePresence mode="wait" initial={false}>
                  {reading ? (
                    <motion.div
                      className="reading-context"
                      key="reading"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={spring}
                    >
                      <ReadingProgress
                        key={article.slug}
                        title={article.title}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      className="header-idle-context header-atmosphere-context"
                      key="idle"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={spring}
                    >
                      <motion.button
                        className={`living-activity-trigger ${open && panel === "activity" ? "selected" : ""}`}
                        onClick={() => show("activity")}
                        aria-label={t("activityLabel")}
                        aria-expanded={open && panel === "activity"}
                        aria-controls="header-panel"
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="living-state-mark" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none">
                            <path d="M7 4C-1 9 4 23 14 21M17 3q6 2 5 9" />
                          </svg>
                          <i />
                        </span>
                        <span className="living-status">
                          <span>
                            {t("now")} <span>{t("doing")}</span>
                          </span>
                          <strong>
                            {t("coding")}
                            <span className="status-type-caret" />
                          </strong>
                        </span>
                        <ChevronDown size={11} />
                        <span className="compact-activity-hint">
                          {t("coding")}
                        </span>
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="header-navigation">
              <SiteNavigation
                articles={articles}
                content={navigation}
                boundary={header}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <div className="living-actions">
              <MusicPlayer
                expanded={open && panel === "music"}
                onExpandedChange={(value) => {
                  if (value) show("music");
                  else if (panel === "music") setOpen(false);
                }}
                panelContainer={musicContainer}
              />
              <span className="header-widget-divider" />
              <motion.button
                ref={trigger}
                className={`living-search-trigger ${open && panel === "search" ? "selected" : ""}`}
                onClick={() => show("search")}
                aria-label={t("search")}
                aria-expanded={open && panel === "search"}
                aria-controls="header-panel"
                whileTap={{ scale: 0.94 }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={open && panel === "search" ? "close" : "search"}
                    initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 30, scale: 0.7 }}
                    transition={{ duration: 0.15 }}
                  >
                    {open && panel === "search" ? (
                      <X size={17} />
                    ) : (
                      <Search size={17} />
                    )}
                  </motion.span>
                </AnimatePresence>
                <span className="search-text">{t("searchLabel")}</span>
                <kbd>
                  <Command size={10} />K
                </kbd>
              </motion.button>
              {article && (
                <motion.button
                  className={`living-focus-button ${immersive ? "active" : ""}`}
                  aria-label={immersive ? t("focusExit") : t("focusEnter")}
                  aria-pressed={immersive}
                  onClick={onImmersiveChange}
                  whileTap={{ scale: 0.9 }}
                >
                  <Focus size={18} />
                </motion.button>
              )}
              <LoginTrigger />
            </div>
          </div>
        </header>
        <AnchoredPanel
          open={open}
          anchor={anchor}
          boundary={header}
          width={surfaces[panel].width}
          align={surfaces[panel].align}
          id="header-panel"
          label={t(`panels.${panel}`)}
          className={`header-popover header-popover-${panel}`}
        >
          <div className={`living-panel living-panel-${panel}`}>
            <div className="living-panel-heading">
              <span>{t(`panels.${panel}`)}</span>
              <button
                onClick={() => {
                  setOpen(false);
                }}
                aria-label={t("collapsePanel")}
              >
                <X size={16} />
              </button>
            </div>
            {panel === "music" ? (
              <div className="header-music-slot" ref={setMusicContainer} />
            ) : panel === "activity" ? (
              <ActivityDetails />
            ) : (
              <>
                <div className="living-search-field">
                  <Search size={20} />
                  <input
                    ref={input}
                    aria-label={t("searchContent")}
                    placeholder={t("searchPlaceholder")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      aria-label={t("clearSearch")}
                      onClick={() => {
                        setQuery("");
                        input.current?.focus();
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="living-search-meta">
                  <span>
                    {search.loading
                      ? t("loading")
                      : query
                        ? t("results", { count: search.total })
                        : t("recent")}
                  </span>
                  <span>{t("escape")}</span>
                </div>
                <div className="living-search-results">
                  {results.slice(0, 4).map((a, i) => (
                    <motion.div
                      key={a.slug}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        ...spring,
                        delay: reduce ? 0 : i * 0.025,
                      }}
                    >
                      <Link
                        href={`/articles/${a.slug}`}
                        onClick={() => setOpen(false)}
                      >
                        <span className="search-result-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{a.title}</strong>
                          <span>
                            {categories(a.category)} · {a.minutes} min
                          </span>
                        </div>
                        <ArrowRight size={15} />
                      </Link>
                    </motion.div>
                  ))}
                  {!results.length && (
                    <p className="header-search-empty">
                      {search.error ||
                        (search.loading ? t("loading") : t("empty"))}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}
