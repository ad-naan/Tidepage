"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { PlayerRecord, Equalizer } from "./PlayerRecord";
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
type Track = { title: string; artist: string; source: string; cover: string };
const time = (n: number) =>
  `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
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
  const [tracks, setTracks] = useState<Track[]>(() => [
    {
      title: t("tracks.coast.title"),
      artist: t("tracks.coast.artist"),
      source: "/audio/coast.wav",
      cover: "/images/coast.png",
    },
    {
      title: t("tracks.afternoon.title"),
      artist: t("tracks.afternoon.artist"),
      source: "/audio/afternoon.wav",
      cover: "/images/window.png",
    },
  ]);
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
    if (audio.current) {
      audio.current.volume = volume;
      if (Number.isFinite(audio.current.duration))
        setDuration(audio.current.duration);
    }
  }, [volume]);
  useEffect(() => {
    setProgress(0);
    if (playing)
      audio.current?.play().catch(() => {
        setPlaying(false);
        setError(t("playError"));
      });
  }, [index]); // Preserve playback intent when changing tracks.
  useEffect(
    () => () => uploads.current.forEach((url) => URL.revokeObjectURL(url)),
    [],
  );
  async function toggle() {
    if (!audio.current) return;
    setError("");
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setError(t("loadError"));
      }
    }
  }
  function change(offset: number) {
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
          src={track.source}
          preload="metadata"
          onTimeUpdate={() => {
            setProgress(audio.current?.currentTime || 0);
            if (audio.current && Number.isFinite(audio.current.duration))
              setDuration(audio.current.duration);
          }}
          onLoadedMetadata={() => setDuration(audio.current?.duration || 0)}
          onEnded={() => change(1)}
          onError={() => {
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
                    <button
                      className="icon-button"
                      aria-label={t("collapse")}
                      onClick={() => setOpen(false)}
                    >
                      <ChevronDown size={17} />
                    </button>
                  </div>
                  <div className="record-stage">
                    <PlayerRecord large playing={playing} cover={track.cover} />
                    <motion.span
                      className="record-arm"
                      animate={{ rotate: playing ? -28 : -44 }}
                      transition={softSpring}
                    />
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      className="player-track-info"
                      key={track.source}
                      initial={{ opacity: 0, y: 7 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -7 }}
                      transition={{ duration: 0.18 }}
                    >
                      <h3>{track.title}</h3>
                      <p>{track.artist}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="music-progress">
                    <input
                      type="range"
                      aria-label={t("progress")}
                      min={0}
                      max={duration || 1}
                      step={0.1}
                      value={progress}
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
                    <button
                      className="icon-button"
                      aria-label={t("previous")}
                      onClick={() => change(-1)}
                    >
                      <SkipBack size={18} />
                    </button>
                    <motion.button
                      className="player-play"
                      aria-label={playing ? t("pause") : t("play")}
                      onClick={toggle}
                      whileTap={{ scale: 0.9 }}
                    >
                      {playing ? (
                        <Pause size={21} fill="currentColor" />
                      ) : (
                        <Play size={21} fill="currentColor" />
                      )}
                    </motion.button>
                    <button
                      className="icon-button"
                      aria-label={t("next")}
                      onClick={() => change(1)}
                    >
                      <SkipForward size={18} />
                    </button>
                  </div>
                  <div className="player-tools">
                    <Volume2 size={14} />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      aria-label={t("volume")}
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <button
                      className="icon-button"
                      aria-label={t("queue")}
                      onClick={() => setQueue((v) => !v)}
                    >
                      <ListMusic size={17} />
                    </button>
                    <label
                      className="icon-button upload-music"
                      title={t("import")}
                    >
                      <Upload size={15} />
                      <input
                        aria-label={t("import")}
                        type="file"
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
                              cover: "/images/window.png",
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
                          <button
                            className={i === index ? "active" : ""}
                            key={t.source}
                            onClick={() => setIndex(i)}
                          >
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            {t.title}
                            {i === index && <span>♪</span>}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {error && (
                    <p className="player-error" role="status">
                      {error}
                    </p>
                  )}
                </motion.section>
              )}
            </AnimatePresence>,
            panelContainer,
          )}
        <div className="music-dock">
          <button
            className="music-open"
            aria-label={open ? t("dockClose") : t("dockOpen")}
            onClick={togglePanel}
          >
            <span className="record-dock-slot">
              {!open ? (
                <PlayerRecord playing={playing} cover={track.cover} />
              ) : (
                <Equalizer playing={playing} />
              )}
            </span>
            <span>
              {track.title}
              <small>{playing ? t("playing") : t("idle")}</small>
            </span>
          </button>
          <button
            className="dock-play"
            aria-label={playing ? t("dockPause") : t("dockPlay")}
            onClick={toggle}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {open && (
            <button
              className="dock-close"
              aria-label={t("dockPanelClose")}
              onClick={() => setOpen(false)}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}
