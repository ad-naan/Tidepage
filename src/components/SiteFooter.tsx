"use client";

import { useLocale, useTranslations } from "next-intl";
import { Heart, Mail, Rss, ArrowUpRight } from "lucide-react";
import { Link } from "@/shared/i18n/navigation";
import { FooterPresence } from "./FooterPresence";
import { FooterPreferences } from "./FooterPreferences";
import styles from "./SiteFooter.module.css";

export function SiteFooter({
  theme,
  showCoast = false,
  onThemeChange,
  onContact,
  onHeart,
}: {
  theme: "light" | "dark";
  showCoast?: boolean;
  onThemeChange: () => void;
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
            adnaan<span>⌁</span>
          </Link>
          <div className={styles.caption}>
            <span className={styles.captionLine}>
              © 2026
              {showCoast && (
                <Link href="/explore" className={styles.coastLink}>
                  {t("coast")}
                  <ArrowUpRight size={10} aria-hidden="true" />
                </Link>
              )}
            </span>
            <small>{t("demo")}</small>
          </div>
          <div className={styles.contact}>
            <button aria-label={t("heart")} onClick={onHeart}>
              <Heart size={13} />
            </button>
            <a href={`/feed.xml?locale=${locale}`} aria-label={t("rss")}>
              <Rss size={13} />
            </a>
            <button aria-label={t("contact")} onClick={onContact}>
              <Mail size={13} />
            </button>
          </div>
        </div>
        <div className={styles.tools}>
          <FooterPreferences theme={theme} onThemeChange={onThemeChange} />
          <span className={styles.separator} aria-hidden="true">
            ✧
          </span>
          <FooterPresence />
        </div>
      </div>
    </footer>
  );
}
