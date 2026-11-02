"use client";
import { useTranslations } from "next-intl";
import { useAuthorPresence } from "./useAuthorPresence";
import styles from "./AuthorStatus.module.css";

export function AuthorStatus() {
  const t = useTranslations("activity");
  const { snapshot, connection } = useAuthorPresence();
  const status =
    connection === "unavailable"
      ? "unavailableShort"
      : connection === "connecting"
        ? "connecting"
        : snapshot.status;
  return (
    <>
      <span
        className={`living-state-mark ${styles.mark}`}
        data-state={snapshot.status}
        aria-hidden="true"
      >
        <i />
      </span>
      <span className="living-status">
        <strong>{t(status)}</strong>
      </span>
    </>
  );
}
