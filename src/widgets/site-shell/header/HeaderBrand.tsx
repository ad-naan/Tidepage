"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import styles from "./HeaderBrand.module.css";

export function HeaderBrand({ avatar }: { avatar: string }) {
  const t = useTranslations("header");
  return (
    <Link href="/" className={styles.brand} aria-label={t("wordmark")}>
      <img src={avatar} width="30" height="30" alt="" decoding="async" />
    </Link>
  );
}
