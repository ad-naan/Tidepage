"use client";
import { useTranslations } from "next-intl";
import { navigationItems } from "@/shared/config/site";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { usePathname } from "@/shared/i18n/navigation";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Mail, X, Heart, ArrowRight } from "lucide-react";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { Dialog } from "@/shared/ui/primitives";
import { spring } from "@/shared/lib/motion";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

import type {
  ArticleSummary,
  NavigationOverview,
} from "@/modules/content/domain/models";

const nav = navigationItems;
export function Shell({
  children,
  articles,
  navigation,
}: {
  children: ReactNode;
  articles: ArticleSummary[];
  navigation: NavigationOverview;
}) {
  const t = useTranslations("nav"),
    footer = useTranslations("footer"),
    contactT = useTranslations("contact");
  const pathname = usePathname();
  const [theme, setTheme] = useLocalState<"light" | "dark">(
    "adnaan-theme",
    "light",
  );
  const [immersive, setImmersive] = useState(false);
  const [contact, setContact] = useState(false);
  const [secret, setSecret] = useState(false);
  const [visitedCoast, setVisitedCoast] = useState(false);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
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
          navigation={navigation}
          label={t(
            nav.find(
              (item) =>
                item.href ===
                (pathname.startsWith("/articles/") ? "/articles" : pathname),
            )?.key || "elsewhere",
          )}
          immersive={immersive}
          onImmersiveChange={() => setImmersive((v) => !v)}
        />
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
          <SiteFooter
            showCoast={visitedCoast && pathname !== "/"}
            theme={theme}
            onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
            onContact={() => setContact(true)}
            onHeart={() => setSecret(true)}
          />
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
