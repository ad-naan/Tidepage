"use client";

import { Button } from "@/shared/ui/button/Button";
import { Anchor } from "@/shared/ui/link/Anchor";
import type { CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Heart, Mail, Rss, ArrowUpRight } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { FooterPreferences } from "./FooterPreferences";
import styles from "./SiteFooter.module.css";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import { LiveReaders } from "@/modules/presence/ui/LiveReaders";
import { JournalLink } from "@/modules/journal/ui/Journal";
import { siteAssets } from "@/shared/config/assets";
import { feedPath } from "@/shared/config/site";
import type { ThemePreference } from "@/shared/ui/preferences/useThemePreference";

const otterAssets = {
  "--otter-light": `url("${siteAssets.footerOtterLight}")`,
  "--otter-dark": `url("${siteAssets.footerOtterDark}")`,
  "--otter-still-light": `url("${siteAssets.footerOtterStillLight}")`,
  "--otter-still-dark": `url("${siteAssets.footerOtterStillDark}")`,
} as CSSProperties;

export function SiteFooter({
  year,
  caption,
  theme,
  showCoast = false,
  onThemeChange,
  onContact,
  onHeart,
}: {
  year: string;
  caption?: string;
  theme: ThemePreference;
  showCoast?: boolean;
  onThemeChange: (theme: ThemePreference) => void;
  onContact: () => void;
  onHeart: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("footer");
  const header = useTranslations("header");
  return (
    <footer className={`page-footer ${styles.footer}`}>
      <svg
        className={styles.shore}
        viewBox="0 0 1320 22"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 13c57-3 81 2 143-1s102 4 163 0 96-1 157 1 99-4 166-1 95 0 158-1 94 4 151 1 101-2 163 0 151-1 219-3" />
        <path d="M5 17c108-3 194 3 279-1s190 1 290-1 175 4 279 0 279 3 459-2" />
        <path
          className={styles.warmStroke}
          d="M1015 12q18-6 41-1t50-.5m-62 7q19-3 38-1"
        />
      </svg>
      <div className={styles.row}>
        <div className={styles.identity}>
          <Link
            href="/"
            className={styles.signature}
            aria-label={header("wordmark")}
          >
            <AuthorSignature size="sm" mark />
          </Link>
          <div className={styles.caption}>
            <span className={styles.captionLine}>
              © {year}
              {showCoast && (
                <Link href="/explore" className={styles.coastLink}>
                  {t("coast")}
                  <ArrowUpRight size={10} aria-hidden="true" />
                </Link>
              )}
            </span>
            {caption && <p className={styles.customCaption}>{caption}</p>}
          </div>
          <div className={styles.contact}>
            <Button aria-label={t("heart")} onClick={onHeart}>
              <Heart size={13} />
            </Button>
            <Anchor href={feedPath(locale)} aria-label={t("rss")}>
              <Rss size={13} />
            </Anchor>
            <Button aria-label={t("contact")} onClick={onContact}>
              <Mail size={13} />
            </Button>
          </div>
        </div>
        <div className={styles.illustration} aria-hidden="true">
          <div className={styles.otter} style={otterAssets} />
        </div>
        <div className={styles.utilities}>
          <JournalLink />
          <LiveReaders />
          <FooterPreferences theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </footer>
  );
}
