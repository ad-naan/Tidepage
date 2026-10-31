"use client";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { usePageNotice } from "@/shared/ui/feedback/NoticeProvider";
import { Text } from "@/shared/ui/typography/Text";
import styles from "./RoomHeading.module.css";

type Room = "archive" | "notes" | "projects" | "quotes" | "gallery" | "about";
const numbers: Record<Room, string> = {
  archive: "01",
  notes: "02",
  projects: "03",
  quotes: "04",
  gallery: "05",
  about: "06",
};
const drawings: Record<Room, ReactNode> = {
  archive: (
    <>
      <path d="M28 100h244M38 106h224M58 98V40h18v58m5 0V31h24v67m6 0V47h14v51m12-1-9-55 16-3 10 58m17 1V35h28v63m6 0V49h18v49m5-1 13-49 17 5-12 45" />
      <path
        d="M63 49h8m16-8h12m-12 42h12m76-38h20m-20 38h20m-30-53c-8-6-5-12 3-14m-32 3 4-7m101 10 3-8"
        className={styles.accent}
      />
      <circle cx="252" cy="29" r="10" className={styles.faint} />
    </>
  ),
  notes: (
    <>
      <path d="M60 48 131 32l19 69-71 14zM159 35l75 11-9 68-75-11zM70 49l13-3m86-10 13 2" />
      <path
        d="m86 67 38-8m-34 22 30-7m47-20 47 7m-49 9 34 5m-4 31 20-3 8-18"
        className={styles.faint}
      />
      <path
        d="m113 30 15-4m55 12 17 3M43 99c-7-17 9-28 15-17s-2 18-15 17Z"
        className={styles.accent}
      />
    </>
  ),
  projects: (
    <>
      <path d="M42 100h216M62 100V65l38-27 38 27v35m-71-39h66m-51 39V77h17v23m17-25h13v13h-13M180 94l22-67 22 67m-37-22h30m-15-45v79m-44-7h88M51 29v12m-6-6h12" />
      <circle cx="202" cy="27" r="5" className={styles.accent} />
      <path
        d="M154 50c9-12 26-18 45-14M54 109h87m14 0h50m22 0h15"
        className={styles.faint}
      />
      <path d="m143 61 10-11 4 10m-62-24 4-9 5 9" className={styles.accent} />
    </>
  ),
  quotes: (
    <>
      <path
        d="M45 70c51-18 84 13 128-2s68-17 89-10M66 85c37-5 52 6 81 0"
        className={styles.faint}
      />
      <path d="m151 53 17-18 7 24-24-6Zm0 0-17-10 34-8m-17 18 2 9 8-6" />
      <path
        d="M91 49c-6-8-1-14 7-12m107 52 4-6m-4-1 6 5"
        className={styles.accent}
      />
    </>
  ),
  gallery: (
    <>
      <path d="m62 47 70-15 14 66-70 15ZM155 28l76 11-10 72-76-11Z" />
      <path
        d="m73 55 50-11 9 39-50 11Zm82-13 64 9-7 43-64-9Z"
        className={styles.faint}
      />
      <path d="m82 89 11-19 16 10 9-15 12 17m26-2 18-18 17 16 14-10 10 23" />
      <circle cx="187" cy="57" r="5" className={styles.accent} />
      <path
        d="m43 68-3-8m204 24 6 3M148 9v10m-5-5h10"
        className={styles.accent}
      />
    </>
  ),
  about: (
    <>
      <path d="m79 58 72-28 72 28v46H79Zm0 0 72 32 72-32M79 104l49-27m95 27-50-27M113 56V18h76v38" />
      <path d="M125 32h48m-48 10h35m-35 10h42" className={styles.faint} />
      <circle cx="151" cy="89" r="9" className={styles.accent} />
      <path
        d="m148 89 2 3 5-6M55 43l-4-5m188 0 5-6"
        className={styles.accent}
      />
    </>
  ),
};

export function RoomHeading({
  room,
  title,
  description,
}: {
  room: Room;
  title: string;
  description: string;
}) {
  const t = useTranslations("rooms");
  usePageNotice({ key: room, title, eyebrow: t(`${room}.label`) });
  return (
    <header className={styles.heading} data-room={room}>
      <div className={styles.identity}>
        <span className={styles.number}>{numbers[room]}</span>
        <div>
          <Text variant="caption" tone="muted" className={styles.eyebrow}>
            {t(`${room}.label`)}
          </Text>
          <h1>{title}</h1>
        </div>
      </div>
      <p>{description}</p>
      <div className={styles.vignette} title={t(`${room}.aside`)}>
        <svg viewBox="0 0 300 130" fill="none" aria-hidden="true">
          {drawings[room]}
        </svg>
      </div>
    </header>
  );
}
