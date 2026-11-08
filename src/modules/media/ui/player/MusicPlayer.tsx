"use client";
import { Button } from "@/shared/ui/button/Button";
import { RangeSlider, FileInput } from "@/shared/ui/field/Input";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { PlayerRecord, Equalizer } from "./PlayerRecord";
import { RecordDeck } from "./RecordDeck";
import {
  ChevronDown,
  Headphones,
  ListMusic,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Upload,
  Volume2,
  X,
} from "lucide-react";
import { softSpring } from "@/shared/lib/motion";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { apiGet } from "@/shared/http/client";
import type { MusicTrack } from "@/shared/contracts/music";
import styles from "./MusicPlayer.module.css";
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
  const uploads = useRef<string[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistFailed, setPlaylistFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const playbackIntent = useRef(false);
  const [index, setIndex] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const togglePanel = () => setOpen(!open);
  const [queue, setQueue] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [error, setError] = useState("");
  const track = tracks[index];
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
  useEffect(
    () => () => uploads.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
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
  function change(offset: number) {
    setError("");
    if (tracks.length)
      setIndex((v) => (v + offset + tracks.length) % tracks.length);
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
            if (tracks.length === 1 && audio.current) {
              audio.current.currentTime = 0;
              if (playbackIntent.current) void play();
            } else change(1);
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
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
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
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
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
                      onChange={(e) => {
                        if (audio.current)
                          audio.current.currentTime = Number(e.target.value);
                        setProgress(Number(e.target.value));
                      }}
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
                      onClick={() => setQueue((v) => !v)}
                    >
                      <ListMusic size={17} />
                    </Button>
                    <label
                      className="icon-button upload-music"
                      title={t("import")}
                    >
                      <Upload size={15} />
                      <FileInput
                        aria-label={t("import")}

                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = URL.createObjectURL(file);
                          uploads.current.push(url);
                          setTracks((v) => [
                            ...v,
                            {
                              title: file.name.replace(/\.[^.]+$/, ""),
                              artist: t("localArtist"),
                              source: url,
                              cover: "",
                            },
                          ]);
                          setQueue(true);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <AnimatePresence initial={false}>
                    {queue && (
                      <motion.div
                        className="player-queue"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={softSpring}
                      >
                        {tracks.map((t, i) => (
                          <Button
                            className={i === index ? "active" : ""}
                            key={t.source}
                            onClick={() => {
                              setError("");
                              setIndex(i);
                            }}
                          >
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            {t.title}
                            {i === index && <span>♪</span>}
                          </Button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
        <div className="music-dock">
          <Button
            className="music-open"
            aria-label={open ? t("dockClose") : t("dockOpen")}
            onClick={togglePanel}
          >
            <span className="record-dock-slot">
              {!open ? (
                <PlayerRecord playing={playing} cover={track?.cover ?? ""} />
              ) : (
                <Equalizer playing={playing} />
              )}
            </span>
            <span>
              {track?.title ?? t(loading ? "loadingPlaylist" : "empty")}
              <small>{playing ? t("playing") : t("idle")}</small>
            </span>
          </Button>
          <Button
            className="dock-play"
            aria-label={playing ? t("dockPause") : t("dockPlay")}
            onClick={toggle}
            disabled={!track}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </Button>
          {open && (
            <Button
              className="dock-close"
              aria-label={t("dockPanelClose")}
              onClick={() => setOpen(false)}
            >
              <X size={12} />
            </Button>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}
