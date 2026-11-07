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
import { spring } from "@/shared/lib/motion";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
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
} from "lucide-react";
import { Link, usePathname } from "@/shared/i18n/navigation";
import { NoticeDock } from "@/shared/ui/feedback/NoticeProvider";
import { ThemeToggle } from "@/shared/ui/preferences/ThemeToggle";
import { LanguageSwitcher } from "@/shared/ui/preferences/LanguageSwitcher";
import { HanddrawnMark } from "@/shared/ui/drawing/HanddrawnMark";
import styles from "./AdminShell.module.css";
import { Button } from "@/shared/ui/button/Button";
import { apiSend } from "@/shared/http/client";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
const entries = [
  ["overview", "/admin", Compass],
  ["articles", "/admin/articles", FileText],
  ["notes", "/admin/notes", StickyNote],
  ["projects", "/admin/projects", Blocks],
  ["quotes", "/admin/quotes", Quote],
  ["gallery", "/admin/gallery", Image],
  ["media", "/admin/media", Image],
  ["friends", "/admin/friends", Shell],
  ["site", "/admin/site", Settings],
] as const;
export function AdminShell({
  children,
  canManageGallery,
}: {
  children: ReactNode;
  canManageGallery: boolean;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const main = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (main.current) main.current.scrollTop = 0;
  }, [pathname]);
  const [theme, setTheme] = useLocalState<"light" | "dark">(
    "adnaan-theme",
    "light",
  );
  const [signingOut, setSigningOut] = useState(false);
  const { notify } = useNotice();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <MotionConfig transition={spring} reducedMotion="user">
      <div className={styles.shell}>
        <header className={styles.top}>
          <Link href="/admin" className={styles.brand}>
            <AuthorSignature size="sm" />
          </Link>
          <span>{t("name")}</span>
          <small>{t("localMode")}</small>
          <NoticeDock />
          <Button
            variant="quiet"
            size="sm"
            busy={signingOut}
            onClick={async () => {
              setSigningOut(true);
              try {
                await apiSend("/api/v1/auth/session", "DELETE");
                window.location.reload();
              } catch {
                setSigningOut(false);
                notify({ title: t("storageError"), tone: "error" });
              }
            }}
          >
            {t("access.signOut")}
          </Button>
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
              {entries
                .filter(([key]) => key !== "gallery" || canManageGallery)
                .map(([key, href, Icon]) => (
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
            {pathname !== "/admin/site" && (
              <div className={styles.mode}>{t("localDetail")}</div>
            )}
            <div className={styles.page} key={pathname}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
