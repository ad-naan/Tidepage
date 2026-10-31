"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import styles from "./HeaderBrand.module.css";

export function HeaderBrand({ compact }: { compact: boolean }) {
  const t = useTranslations("header");
  return (
    <Link
      href="/"
      className={styles.brand}
      data-compact={compact}
      aria-label={t("wordmark")}
    >
      <span className={styles.signature} aria-hidden="true">
        adnaan
        <svg className={styles.arrow} viewBox="0 0 22 16" fill="none">
          <path
            d="m2 6 8 4-4-7 13 6-5 2"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className={styles.symbol} aria-hidden="true">
        <img
          src="/images/author-avatar.png"
          width="38"
          height="38"
          alt=""
          decoding="async"
        />
        <svg className={styles.avatarOutline} viewBox="0 0 40 40" fill="none">
          <path
            d="M20 2C9 1 2 9 2 20s8 18 19 18 17-9 17-19S30 1 20 2ZM8 7q-6 6-5 14"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
            filter="url(#tidepage-pencil)"
          />
        </svg>
      </span>
    </Link>
  );
}
