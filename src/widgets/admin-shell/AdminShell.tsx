"use client";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { MotionConfig } from "motion/react";
import {
  ArrowUpRight,
  Compass,
  FileText,
  Image,
  Settings,
  StickyNote,
  Blocks,
  Quote,
  Shell,
  MessagesSquare,
} from "lucide-react";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { NoticeDock } from "@/shared/ui/feedback/NoticeProvider";
import { ThemeToggle } from "@/shared/ui/preferences/ThemeToggle";
import { LanguageSwitcher } from "@/shared/ui/preferences/LanguageSwitcher";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import styles from "./AdminShell.module.css";
const entries = [
  ["overview", "/admin", Compass],
  ["articles", "/admin/articles", FileText],
  ["notes", "/admin/notes", StickyNote],
  ["projects", "/admin/projects", Blocks],
  ["quotes", "/admin/quotes", Quote],
  ["gallery", "/admin/gallery", Image],
  ["media", "/admin/media", Image],
  ["friends", "/admin/friends", Shell],
  ["comments", "/admin/comments", MessagesSquare],
  ["site", "/admin/site", Settings],
] as const;
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [pathname]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = localStorage.getItem("garden-theme");
    if (saved === "dark") {
      setTheme("dark");
      document.documentElement.dataset.theme = "dark";
    }
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.shell}>
        <header className={styles.top}>
          <Link href="/admin" className={styles.brand}>
            adnaan<span>.</span>
          </Link>
          <span>{t("name")}</span>
          <small>{t("localMode")}</small>
          <NoticeDock />
          <Link href="/" className={styles.visit}>
            {t("visit")}
            <ArrowUpRight size={13} />
          </Link>
        </header>
        <div className={styles.layout}>
          <aside
            className={styles.sidebar}
            data-custom-scroll={t("navigation")}
          >
            <nav aria-label={t("navigation")}>
              {entries.map(([key, href, Icon]) => (
                <Link
                  key={key}
                  href={href}
                  prefetch
                  aria-current={
                    (
                      href === "/admin"
                        ? pathname === href
                        : pathname.startsWith(href)
                    )
                      ? "page"
                      : undefined
                  }
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{t(`nav.${key}`)}</span>
                  <HanddrawnMark className={styles.mark} />
                </Link>
              ))}
            </nav>
            <div className={styles.preferences}>
              <Suspense>
                <LanguageSwitcher />
              </Suspense>
              <ThemeToggle
                theme={theme}
                onChange={() => {
                  const next = theme === "light" ? "dark" : "light";
                  setTheme(next);
                  document.documentElement.dataset.theme = next;
                  localStorage.setItem("garden-theme", next);
                }}
              />
            </div>
          </aside>
          <main
            ref={main}
            id="main-content"
            data-writing={/\/articles\/(new|[^/]+\/edit|import\/)/.test(
              pathname,
            )}
            className={styles.main}
            data-custom-scroll={t("workspace")}
          >
            <div className={styles.mode}>{t("localDetail")}</div>
            {children}
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
