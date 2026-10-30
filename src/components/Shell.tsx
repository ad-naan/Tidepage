"use client";
import { useLocale, useTranslations } from "next-intl";
import { navigationItems } from "@/shared/config/site";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { usePathname } from "@/shared/i18n/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Mail, Rss, X, Heart, ArrowRight } from "lucide-react";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { Dialog } from "@/shared/ui/primitives";
import { spring } from "@/shared/lib/motion";
import { SiteHeader } from "./SiteHeader";
import { CelestialNav } from "./CelestialNav";

import type { ArticleSummary } from "@/modules/content/domain/models";

const nav = navigationItems;
export function Shell({
  children,
  articles,
}: {
  children: ReactNode;
  articles: ArticleSummary[];
}) {
  const t = useTranslations("nav"),
    footer = useTranslations("footer"),
    ui = useTranslations("common"),
    contactT = useTranslations("contact");
  const locale = useLocale();
  const pathname = usePathname();
  const [theme, setTheme] = useLocalState<"light" | "dark">(
    "adnaan-theme",
    "light",
  );
  const [menu, setMenu] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [contact, setContact] = useState(false);
  const [secret, setSecret] = useState(false);
  const [visitedCoast, setVisitedCoast] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    setMenu(false);
    setImmersive(false);
    try {
      setVisitedCoast(sessionStorage.getItem("coast-visited") === "true");
    } catch {
      /* Optional navigation hint. */
    }
  }, [pathname]);
  return (
    <MotionConfig transition={spring} reducedMotion="user">
      <div
        className={`site-shell ${immersive ? "is-immersive" : ""}`}
        data-page={pathname === "/" ? "home" : "inner"}
      >
        <SiteHeader
          articles={articles}
          label={t(
            nav.find(
              (item) =>
                item.href ===
                (pathname.startsWith("/articles/") ? "/articles" : pathname),
            )?.key || "elsewhere",
          )}
          immersive={immersive}
          onImmersiveChange={() => setImmersive((v) => !v)}
          theme={theme}
          onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
          menuOpen={menu}
          onMenuToggle={() => setMenu((v) => !v)}
        />
        <CelestialNav
          theme={theme}
          mobileOpen={menu}
          onNavigate={() => setMenu(false)}
          immersive={immersive}
        />{" "}
        {menu && (
          <button
            className="mobile-scrim"
            aria-label={ui("close")}
            onClick={() => setMenu(false)}
          />
        )}
        <div className="main-wrap">
          <main id="main-content">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {children}
            </motion.div>
          </main>
          {visitedCoast && pathname !== "/" && (
            <Link href="/explore" className="return-to-coast">
              {footer("coast")} <ArrowRight size={14} />
            </Link>
          )}
          <footer className="page-footer">
            <div className="footer-identity">
              <span>© 2026 adnaan</span>
              <button
                aria-label={footer("heart")}
                onClick={() => setSecret(true)}
              >
                <Heart size={14} />
              </button>
              <a href={`/feed.xml?locale=${locale}`} aria-label={footer("rss")}>
                <Rss size={14} />
              </a>
              <button
                aria-label={footer("contact")}
                onClick={() => setContact(true)}
              >
                <Mail size={14} />
              </button>
            </div>
            <span>
              {footer("demo")} <span className="footer-star">✳</span>
            </span>
          </footer>
        </div>
        {contact && (
          <Dialog title={contactT("title")} onClose={() => setContact(false)}>
            <div className="contact-card">
              <Mail size={32} />
              <h2>{contactT("heading")}</h2>
              <p>
                {contactT("body1")}
                <br />
                {contactT("body2")}
              </p>
              <Link
                href="/about"
                onClick={() => setContact(false)}
                className="button-outline"
              >
                {contactT("link")} <ArrowRight size={16} />
              </Link>
            </div>
          </Dialog>
        )}
        <AnimatePresence>
          {secret && (
            <motion.button
              className="secret-toast"
              onClick={() => setSecret(false)}
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
            >
              {footer("gratitude")}
              <Heart size={17} fill="currentColor" />
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
