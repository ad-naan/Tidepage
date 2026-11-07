"use client";
import { useTranslations } from "next-intl";
import { navigationItems } from "@/shared/config/site";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { usePathname } from "@/shared/i18n/navigation";
import { MotionConfig, motion } from "motion/react";
import { Mail, ArrowRight } from "lucide-react";
import { useLocalState } from "@/shared/hooks/useLocalState";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { spring } from "@/shared/lib/motion";
import { SiteHeader } from "@/widgets/site-shell/header/SiteHeader";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import { SiteFooter } from "@/widgets/site-shell/footer/SiteFooter";
import { ExternalLinkPreview } from "@/shared/ui/link/ExternalLinkPreview";
import type { SitePresentation } from "@/modules/site-settings/domain/presentation";

import type {
  ArticleSummary,
  NavigationOverview,
} from "@/modules/content/domain/models";

const nav = navigationItems;
export function SiteShell({
  children,
  articles,
  navigation,
  avatar,
  year,
  presentation,
}: {
  children: ReactNode;
  articles: ArticleSummary[];
  navigation: NavigationOverview;
  avatar: string;
  year: string;
  presentation: SitePresentation;
}) {
  const t = useTranslations("nav"),
    footer = useTranslations("footer"),
    feedback = useTranslations("feedback"),
    contactT = useTranslations("contact");
  const pathname = usePathname();
  const [theme, setTheme] = useLocalState<"light" | "dark">(
    "adnaan-theme",
    "light",
  );
  const [immersive, setImmersive] = useState(false);
  const [contact, setContact] = useState(false);
  const { notify } = useNotice();
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
      <ExternalLinkPreview />
      <div
        className={`site-shell ${immersive ? "is-immersive" : ""}`}
        data-page={pathname === "/" ? "home" : "inner"}
      >
        <SiteHeader
          articles={articles}
          navigation={navigation}
          avatar={avatar}
          navigationItems={presentation.navigation}
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
            year={year}
            caption={presentation.footer}
            showCoast={visitedCoast && pathname !== "/"}
            theme={theme}
            onThemeChange={() => setTheme(theme === "light" ? "dark" : "light")}
            onContact={() => setContact(true)}
            onHeart={() =>
              notify({
                title: feedback("thanks"),
                detail: footer("gratitude"),
                tone: "success",
                duration: 6500,
              })
            }
          />
        </div>
        {contact && (
          <Dialog title={contactT("title")} onClose={() => setContact(false)}>
            <div className="contact-card">
              <Mail size={32} />
              <h2>{contactT("heading")}</h2>
              <p>
                {presentation.publicContact || (
                  <>
                    {contactT("body1")}
                    <br />
                    {contactT("body2")}
                  </>
                )}
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
      </div>
    </MotionConfig>
  );
}
