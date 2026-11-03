"use client";
import { useTranslations } from "next-intl";
import { Monitor } from "lucide-react";
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
  const app =
    connection === "connected" && snapshot.status === "online"
      ? snapshot.apps[0]
      : undefined;
  if (app)
    return (
      <span className={styles.application}>
        {app.icon ? (
          <img
            src={app.icon}
            alt={t("usingApplication", { name: app.name })}
            width={24}
            height={24}
            draggable={false}
          />
        ) : (
          <Monitor
            size={24}
            role="img"
            aria-label={t("usingApplication", { name: app.name })}
          />
        )}
        <i aria-hidden="true" />
      </span>
    );
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
