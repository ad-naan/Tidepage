"use client";
import { useTranslations } from "next-intl";
import styles from "./AdminShell.module.css";
export function AdminLoading() {
  const t = useTranslations("admin");
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <span>{t("loading")}</span>
      <div />
      <div />
      <div />
    </div>
  );
}
