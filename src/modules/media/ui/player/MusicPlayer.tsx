"use client";
import { Button } from "@/shared/ui/button/Button";
import { RangeSlider } from "@/shared/ui/field/Input";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { PlayerDock } from "./PlayerDock";
import { LyricsPanel } from "./LyricsPanel";
import { useLyrics } from "./useLyrics";
import { activeLyricIndex, lyricProgress } from "@/modules/media/domain/lyrics";
import { FilterTabs } from "@/shared/ui/filter-tabs/FilterTabs";
import { RecordDeck } from "./RecordDeck";
import {
  ChevronDown,
  Headphones,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { softSpring } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { apiGet } from "@/shared/http/client";
import type { MusicTrack } from "@/shared/contracts/music";
import styles from "./MusicPlayer.module.css";
import {
  nextPlaybackMode,
  playbackModes,
  randomTrackIndex,
  type PlaybackMode,
} from "@/modules/media/domain/playback";
const time = (n: number) =>
  Number.isFinite(n)
    ? `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`
    : "0:00";
export function MusicPlayer({
  expanded: open,
  onExpandedChange: setOpen,
  panelContainer,
}: {
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  panelContainer: HTMLElement | null;
}) {
  const t = useTranslations("player");
  const audio = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistFailed, setPlaylistFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const playbackIntent = useRef(false);
  const [index, setIndex] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const detailsHeading = useRef<HTMLDivElement>(null);
  const focusLyrics = useRef(false);
  const reduced = useReducedMotion();
  const [queue, setQueue] = useState(false);
  const [mode, setMode] = useState<PlaybackMode>("loop");
  const history = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState("");
  const track = tracks[index];
  const ModeIcon =
    mode === "shuffle" ? Shuffle : mode === "single" ? Repeat1 : Repeat;
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tidepage:music-mode");
      if (playbackModes.includes(saved as PlaybackMode))
        setMode(saved as PlaybackMode);
    } catch {
      /* Playback does not require browser storage. */
    }
  }, []);
  function switchMode() {
    const next = nextPlaybackMode(mode);
    setMode(next);
    try {
      localStorage.setItem("tidepage:music-mode", next);
    } catch {
      /* Optional preference. */
    }
  }
  useEffect(() => {
    if (!open || !panelContainer || !focusLyrics.current) return;
    const frame = requestAnimationFrame(() => {
      detailsHeading.current
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus({ preventScroll: true });
      focusLyrics.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [open, panelContainer]);
  const lyrics = useLyrics(track);
  const activeLine = activeLyricIndex(lyrics.document.lines, progress);
  const currentLine = lyrics.document.lines[activeLine];
  const dockLine =
    currentLine?.text ||
    t(
      lyrics.phase === "loading"
        ? "lyrics.loading"
        : lyrics.phase === "ready" && lyrics.document.lines.length
          ? activeLine < 0
            ? "lyrics.prelude"
            : "lyrics.interlude"
          : "lyrics.dockFallback",
    );
  const lineProgress = lyricProgress(
    lyrics.document.lines,
    activeLine,
    progress,
    duration,
  );
  function seek(time: number) {
    if (!audio.current || !duration) return;
    audio.current.currentTime = Math.max(0, Math.min(time, duration));
    setProgress(audio.current.currentTime);
  }
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPlaylistFailed(false);
    void apiGet<{ enabled: boolean; tracks: MusicTrack[] }>("/api/v1/music", {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setTracks((current) => [
          ...current,
          ...result.tracks.filter(
            (item) =>
              !current.some((existing) => existing.source === item.source),
          ),
        ]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaylistFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume;
      if (Number.isFinite(audio.current.duration))
        setDuration(audio.current.duration);
    }
  }, [volume]);
  useEffect(() => {
    setProgress(0);
    setDuration(0);
    setError("");
    if (playbackIntent.current && track) void play();
  }, [track?.source]); // Preserve intent when switching sources, including the first remote track.
  async function play() {
    const element = audio.current;
    if (!element || !track) return;
    const source = element.getAttribute("src");
    try {
      await element.play();
    } catch {
      if (element.getAttribute("src") !== source || !playbackIntent.current)
        return;
      playbackIntent.current = false;
      setPlaying(false);
      setError(t("loadError"));
    }
  }
  async function toggle() {
    if (!audio.current || !track) return;
    setError("");
    if (playing || playbackIntent.current) {
      playbackIntent.current = false;
      audio.current.pause();
      setPlaying(false);
    } else {
      playbackIntent.current = true;
      await play();
    }
  }
  function selectTrack(next: number, remember = true) {
    setError("");
    if (next === index) {
      if (audio.current) {
        audio.current.currentTime = 0;
        setProgress(0);
      }
      if (playbackIntent.current) void play();
      return;
    }
    if (remember) {
      history.current.push(index);
      if (history.current.length > 100) history.current.shift();
    }
    setIndex(next);
  }
  function change(offset: number) {
    if (!tracks.length) return;
    if (mode === "shuffle") {
      const previous = offset < 0 ? history.current.pop() : undefined;
      selectTrack(
        previous ?? randomTrackIndex(index, tracks.length),
        previous === undefined,
      );
    } else selectTrack((index + offset + tracks.length) % tracks.length);
  }
  return (
    <LayoutGroup id="header-player">
      <div
        className={`music-widget header-music ${open ? "player-is-open" : ""} ${playing ? "player-is-playing" : ""}`}
        ref={playerRef}
      >
        <audio
          ref={audio}
          src={track?.source}
          preload="metadata"
          onTimeUpdate={() => {
            setProgress(audio.current?.currentTime || 0);
            if (audio.current && Number.isFinite(audio.current.duration))
              setDuration(audio.current.duration);
          }}
          onLoadedMetadata={() =>
            setDuration(
              Number.isFinite(audio.current?.duration)
                ? audio.current!.duration
                : 0,
            )
          }
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            if (mode === "single" || tracks.length === 1)
              selectTrack(index, false);
            else change(1);
          }}
          onError={() => {
            if (!track) return;
            playbackIntent.current = false;
            setPlaying(false);
            setError(t("sourceError"));
          }}
        />
        {panelContainer &&
          createPortal(
            <AnimatePresence>
              {open && (
                <motion.section
                  layout
                  className="music-panel integrated"
                  data-custom-scroll={t("panelRegion")}
                  initial={{
                    opacity: 0,
                    y: reduced ? 0 : 15,
                    scale: reduced ? 1 : 0.95,
                  }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    y: reduced ? 0 : 15,
                    scale: reduced ? 1 : 0.95,
                  }}
                  transition={softSpring}
                  aria-label={t("region")}
                >
                  <div className="music-panel-top">
                    <span>
                      <Headphones size={13} />
                      {t("panel")}
                    </span>
                    <Button
                      className="icon-button"
                      aria-label={t("collapse")}
                      onClick={() => setOpen(false)}
                    >
                      <ChevronDown size={17} />
                    </Button>
                  </div>
                  <div className="record-stage">
                    <RecordDeck playing={playing} cover={track?.cover ?? ""} />
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      className="player-track-info"
                      key={track?.source}
                      initial={{ opacity: 0, y: reduced ? 0 : 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduced ? 0 : -7 }}
                      transition={{ duration: 0.18 }}
                    >
                      <h3>
                        {track?.title ??
                          t(loading ? "loadingPlaylist" : "empty")}
                      </h3>
                      <p>{track?.artist}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="music-progress">
                    <RangeSlider
                      aria-label={t("progress")}
                      min={0}
                      max={duration || 1}
                      step={0.1}
                      value={progress}
                      disabled={!track || !duration}
                      onChange={(e) => seek(Number(e.target.value))}
                    />
                    <div>
                      <span>{time(progress)}</span>
                      <span>{time(duration)}</span>
                    </div>
                  </div>
                  <div className="player-controls">
                    <Button
                      className="icon-button"
                      aria-label={t("previous")}
                      onClick={() => change(-1)}
                      disabled={!tracks.length}
                    >
                      <SkipBack size={18} />
                    </Button>
                    <Button
                      className="player-play"
                      aria-label={playing ? t("pause") : t("play")}
                      onClick={toggle}
                      disabled={!track}
                      whileTap={{ scale: 0.9 }}
                    >
                      {playing ? (
                        <Pause size={21} fill="currentColor" />
                      ) : (
                        <Play size={21} fill="currentColor" />
                      )}
                    </Button>
                    <Button
                      className="icon-button"
                      aria-label={t("next")}
                      onClick={() => change(1)}
                      disabled={!tracks.length}
                    >
                      <SkipForward size={18} />
                    </Button>
                  </div>
                  <div className="player-tools">
                    <Volume2 size={14} />
                    <RangeSlider
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      aria-label={t("volume")}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <Button
                      className="icon-button"
                      aria-label={t("queue")}
                      aria-pressed={queue}
                      onClick={() => setQueue((v) => !v)}
                    >
                      <ListMusic size={17} />
                    </Button>
                    <Button
                      className={styles.modeButton}
                      aria-label={t("mode.switch", {
                        current: t(`mode.${mode}`),
                        next: t(`mode.${nextPlaybackMode(mode)}`),
                      })}
                      title={t("mode.switch", {
                        current: t(`mode.${mode}`),
                        next: t(`mode.${nextPlaybackMode(mode)}`),
                      })}
                      onClick={switchMode}
                    >
                      <ModeIcon size={16} />
                      <span className={styles.modeLabel}>
                        {t(`mode.${mode}`)}
                      </span>
                    </Button>
                  </div>
                  <div className={styles.details}>
                    <div ref={detailsHeading} className={styles.detailsHeading}>
                      <FilterTabs
                        label={t("lyrics.views")}
                        value={queue ? "queue" : "lyrics"}
                        options={[
                          { value: "lyrics", label: t("lyrics.tab") },
                          {
                            value: "queue",
                            label: t("lyrics.queueTab"),
                            count: tracks.length,
                          },
                        ]}
                        onChange={(value) => setQueue(value === "queue")}
                      />
                      <span className={styles.sideNote}>
                        {t(queue ? "lyrics.queueNote" : "lyrics.note")}
                      </span>
                    </div>
                    {queue ? (
                      <div
                        className={styles.queue}
                        data-custom-scroll={t("queue")}
                        role="group"
                        aria-label={t("queue")}
                      >
                        {tracks.map((item, i) => (
                          <Button
                            className={styles.queueItem}
                            data-active={i === index}
                            key={item.source}
                            aria-pressed={i === index}
                            onClick={() => {
                              selectTrack(i);
                            }}
                          >
                            <span className={styles.trackNumber}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className={styles.trackName}>
                              {item.title}
                              <small>{item.artist}</small>
                            </span>
                            {i === index && (
                              <span
                                className={styles.nowPlaying}
                                aria-hidden="true"
                              >
                                ?
                              </span>
                            )}
                          </Button>
                        ))}
                        {!tracks.length && (
                          <p className={styles.queueEmpty}>{t("empty")}</p>
                        )}
                      </div>
                    ) : (
                      <LyricsPanel
                        key={track?.source ?? "empty"}
                        document={lyrics.document}
                        phase={lyrics.phase}
                        active={activeLine}
                        canSeek={duration > 0}
                        onSeek={seek}
                        onRetry={lyrics.retry}
                      />
                    )}
                  </div>
                  {error && (
                    <p className="player-error" role="status">
                      {error}
                    </p>
                  )}
                  {playlistFailed && (
                    <div className={styles.status} role="status">
                      <p>{t("playlistError")}</p>
                      <Button
                        variant="quiet"
                        size="sm"
                        onClick={() => setAttempt((value) => value + 1)}
                      >
                        {t("retryPlaylist")}
                      </Button>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>,
            panelContainer,
          )}
        <PlayerDock
          track={track}
          playing={playing}
          open={open}
          loading={loading}
          line={dockLine}
          lineProgress={lineProgress}
          onToggle={toggle}
          onOpen={(keyboard) => {
            focusLyrics.current = keyboard;
            setQueue(false);
            if (!open || !queue) setOpen(!open);
          }}
        />
      </div>
    </LayoutGroup>
  );
}
