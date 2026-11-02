"use client";
import { useTranslations } from "next-intl";
import { Monitor, Music2 } from "lucide-react";
import { useAuthorPresence } from "./useAuthorPresence";
import styles from "./AuthorActivity.module.css";

export function AuthorActivity() {
  const t = useTranslations("activity");
  const { snapshot, connection } = useAuthorPresence();
  if (connection === "unavailable")
    return <p className="presence-note">{t("unavailable")}</p>;
  if (snapshot.status !== "online")
    return (
      <p className="presence-note">
        {t(connection === "connecting" ? "connecting" : snapshot.status)}
      </p>
    );
  return (
    <div className={styles.activity}>
      <p className={styles.status}>
        <span aria-hidden="true" />
        {t("online")}
      </p>
      {snapshot.apps.length ? (
        <ul className={styles.apps} aria-label={t("applications")}>
          {snapshot.apps.map((app) => (
            <li key={app.id}>
              {app.icon ? (
                <img src={app.icon} alt="" width={28} height={28} />
              ) : (
                <Monitor size={22} aria-hidden="true" />
              )}
              <span>{app.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t("noApplications")}</p>
      )}
      {snapshot.track && (
        <div className={styles.track}>
          <Music2 size={20} aria-hidden="true" />
          <div>
            <span className={styles.label}>{t("listening")}</span>
            <strong>{snapshot.track.title}</strong>
            <span>{snapshot.track.artist}</span>
          </div>
        </div>
      )}
      <p className={styles.note}>{t("sharedOnly")}</p>
    </div>
  );
}
