"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Pause, Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";
import { PlayerRecord, Equalizer } from "./PlayerRecord";
import type { MusicTrack } from "@/shared/contracts/music";
import styles from "./PlayerDock.module.css";

export function PlayerDock({
  track,
  playing,
  open,
  loading,
  line,
  lineProgress,
  onToggle,
  onOpen,
}: {
  track?: MusicTrack;
  playing: boolean;
  open: boolean;
  loading: boolean;
  line: string;
  lineProgress: number;
  onToggle: () => void;
  onOpen: (keyboard: boolean) => void;
}) {
  const t = useTranslations("player");
  const reduced = useReducedMotion();
  return (
    <div className={styles.dock} data-playing={playing}>
      <Button
        className={styles.recordButton}
        disabled={!track}
        onClick={onToggle}
        aria-label={playing ? t("dockPause") : t("dockPlay")}
        title={playing ? t("dockPause") : t("dockPlay")}
      >
        <span className={styles.recordVisual}>
          {open ? (
            <Equalizer playing={playing} />
          ) : (
            <PlayerRecord playing={playing} cover={track?.cover ?? ""} />
          )}
        </span>
        <span className={styles.recordAction} aria-hidden="true">
          {playing ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" />
          )}
        </span>
      </Button>
      <Button
        className={styles.trigger}
        data-music-trigger
        aria-expanded={open}
        aria-controls="header-panel"
        aria-label={open ? t("dockClose") : t("dockOpen")}
        title={t("lyrics.openHint")}
        onClick={(event) => onOpen(event.detail === 0)}
        pressEffect={false}
      >
        <span className={styles.caption}>
          <span>
            {track?.title ?? t(loading ? "loadingPlaylist" : "empty")}
          </span>
          <span className={styles.indicator} aria-hidden="true" />
        </span>
        <span className={styles.lineWindow}>
          <AnimatePresence initial={false} mode="wait">
            <motion.span
              key={`${track?.source}:${line}`}
              className={styles.line}
              initial={{ opacity: 0, y: reduced ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -4 }}
              transition={{ duration: reduced ? 0 : 0.18 }}
            >
              {line}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className={styles.ink} aria-hidden="true">
          <span style={{ transform: `scaleX(${lineProgress})` }} />
        </span>
      </Button>
    </div>
  );
}
