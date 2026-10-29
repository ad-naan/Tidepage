"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Code2,
  Command,
  Orbit,
  Focus,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import type { ArticleSummary } from "@/modules/content/domain/models";
import { useArticleSearch } from "@/modules/content/ui/useArticleSearch";
import { spring } from "@/shared/lib/motion";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { LoginTrigger } from "@/modules/identity/ui/PreviewIdentity";
import { ActivityDetails } from "./ActivityDetails";
import { MusicPlayer } from "./MusicPlayer";
import { HeaderStatsPanel, HeaderStatsTrigger } from "./HeaderStats";

type HeaderPanel = "activity" | "search" | "music" | "stats";
type Props = {
  articles: ArticleSummary[];
  label: string;
  immersive: boolean;
  onImmersiveChange: () => void;
  theme: "light" | "dark";
  onThemeChange: () => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
};

export function SiteHeader({
  articles,
  label,
  immersive,
  onImmersiveChange,
  theme,
  onThemeChange,
  menuOpen,
  onMenuToggle,
}: Props) {
  const pathname = usePathname();
  const { open, setOpen, ref } = useDisclosure("header");
  const [panel, setPanel] = useState<HeaderPanel>("activity");
  const [compact, setCompact] = useState(false);
  const [query, setQuery] = useState("");
  const [musicContainer, setMusicContainer] = useState<HTMLDivElement | null>(
    null,
  );
  const condensed = compact || immersive;
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const article = pathname.startsWith("/articles/")
    ? articles.find((a) => pathname.endsWith(a.slug))
    : undefined;
  const reading = !!article && condensed && !open;
  const search = useArticleSearch(query, open && panel === "search", articles);
  const results = search.items;

  useMotionValueEvent(scrollY, "change", (value) => {
    // Hysteresis prevents the header from flickering around a single threshold.
    if (value > 88) setCompact(true);
    else if (value < 40) setCompact(false);
  });

  const show = (next: HeaderPanel) => {
    window.dispatchEvent(
      new CustomEvent("garden-disclosure", { detail: "header" }),
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
        setPanel("search");
        setOpen((value) => (panel === "search" ? !value : true));
      }
      if (event.key === "Escape" && open) trigger.current?.focus();
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [open, panel, setOpen]);

  return (
    <div className="header-slot" ref={ref}>
      <motion.header
        layout
        aria-label={`${label}页面工具`}
        className={`living-header ${condensed ? "is-compact" : "is-resting"} ${open ? "is-expanded" : ""} ${reading ? "is-reading" : ""}`}
        data-state={
          open ? panel : reading ? "reading" : condensed ? "compact" : "resting"
        }
        transition={spring}
        animate={{ y: condensed || open ? 12 : 20 }}
      >
        <motion.div layout="position" className="living-header-row">
          <Link
            href="/"
            className={`header-wordmark ${condensed ? "wordmark-condensed" : ""}`}
            aria-label="adnaan · 光阴副本，首页"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={condensed ? "mark" : "full"}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.13 }}
              >
                {condensed ? "a" : "adnaan"}
                <i>⌁</i>
              </motion.span>
            </AnimatePresence>
          </Link>
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
                  <Link
                    href="/articles"
                    className="header-back"
                    aria-label="返回文章列表"
                  >
                    <ArrowLeft size={17} />
                  </Link>
                  <div>
                    <span>正在阅读</span>
                    <strong>{article.title}</strong>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="header-idle-context"
                  key="idle"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={spring}
                >
                  <motion.button
                    className={`living-activity-trigger ${open && panel === "activity" ? "selected" : ""}`}
                    onClick={() => show("activity")}
                    aria-expanded={open && panel === "activity"}
                    aria-controls="header-panel"
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="living-avatar">
                      <img src="/images/otter-v2.png" alt="" />
                      <i />
                    </span>
                    <span className="living-status">
                      <span>
                        此刻 <span>正在</span>
                      </span>
                      <strong>
                        <Code2 size={13} />
                        写代码
                        <span className="status-type-caret" />
                      </strong>
                    </span>
                    <motion.span
                      animate={{
                        rotate: open && panel === "activity" ? 180 : 0,
                      }}
                      transition={spring}
                    >
                      <ChevronDown size={12} />
                    </motion.span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="living-actions">
            <button
              className={`sky-mobile-activity ${open && panel === "activity" ? "selected" : ""}`}
              onClick={() => show("activity")}
              aria-label="查看作者实时状态"
              aria-expanded={open && panel === "activity"}
              aria-controls="header-panel"
            >
              <Code2 size={15} />
            </button>
            <MusicPlayer
              expanded={open && panel === "music"}
              onExpandedChange={(value) => {
                if (value) show("music");
                else if (panel === "music") setOpen(false);
              }}
              panelContainer={musicContainer}
            />
            <HeaderStatsTrigger
              open={open && panel === "stats"}
              onClick={() => show("stats")}
            />
            <span className="header-widget-divider" />
            <motion.button
              ref={trigger}
              className={`living-search-trigger ${open && panel === "search" ? "selected" : ""}`}
              onClick={() => show("search")}
              aria-label="搜索文章"
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
              <span className="search-text">搜索</span>
              <kbd>
                <Command size={10} />K
              </kbd>
            </motion.button>
            <span className="living-action-divider" />
            <motion.button
              className="living-theme-button"
              aria-label={theme === "light" ? "切换深色模式" : "切换浅色模式"}
              onClick={onThemeChange}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ rotate: -65, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 65, opacity: 0, scale: 0.6 }}
                  transition={spring}
                >
                  {theme === "light" ? <Sun size={19} /> : <Moon size={18} />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
            {article && (
              <motion.button
                className={`living-focus-button ${immersive ? "active" : ""}`}
                aria-label={immersive ? "退出专注阅读" : "进入专注阅读"}
                aria-pressed={immersive}
                onClick={onImmersiveChange}
                whileTap={{ scale: 0.9 }}
              >
                <Focus size={18} />
              </motion.button>
            )}
            <LoginTrigger />
            <button
              className="living-menu-button"
              aria-label="切换光轨导航"
              aria-expanded={menuOpen}
              onClick={onMenuToggle}
            >
              {menuOpen ? <X size={21} /> : <Orbit size={21} />}
            </button>
          </div>
        </motion.div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id="header-panel"
              className="living-panel-clip"
              data-scroll-clip
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={panel}
                  className={`living-panel living-panel-${panel}`}
                  data-custom-scroll="页头内容"
                  data-scroll-axis="vertical"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: reduce ? 0 : 0.15 }}
                >
                  <div className="living-panel-heading">
                    <span>
                      {
                        {
                          activity: "此刻，在做什么",
                          search: "在这里找一找",
                          music: "给下一页一点背景声",
                          stats: "在光阴里相遇",
                        }[panel]
                      }
                    </span>
                    <button
                      onClick={() => {
                        setOpen(false);
                        trigger.current?.focus();
                      }}
                      aria-label="收起页头面板"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {panel === "music" ? (
                    <div
                      className="header-music-slot"
                      ref={setMusicContainer}
                    />
                  ) : panel === "stats" ? (
                    <HeaderStatsPanel />
                  ) : panel === "activity" ? (
                    <ActivityDetails />
                  ) : (
                    <>
                      <div className="living-search-field">
                        <Search size={20} />
                        <input
                          ref={input}
                          aria-label="搜索文章内容"
                          placeholder="文章、话题，或一个关键词…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                          <button
                            aria-label="清除搜索"
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
                            ? "正在搜索…"
                            : query
                              ? `${search.total} 个结果`
                              : "最近的文章"}
                        </span>
                        <span>按 Esc 收起</span>
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
                                  {a.category} · {a.minutes} 分钟阅读
                                </span>
                              </div>
                              <ArrowRight size={15} />
                            </Link>
                          </motion.div>
                        ))}
                        {!results.length && (
                          <p className="header-search-empty">
                            {search.error ||
                              (search.loading
                                ? "正在查找文章…"
                                : "没有找到相关内容，试试其他关键词。")}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        {article && condensed && (
          <motion.div
            className="living-reading-progress"
            style={{ scaleX: reduce ? scrollYProgress : progress }}
            aria-hidden="true"
          />
        )}
      </motion.header>
    </div>
  );
}
