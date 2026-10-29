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
import { createPortal } from "react-dom";
type Track = { title: string; artist: string; source: string; cover: string };
const initialTracks: Track[] = [
  {
    title: "海边的空白",
    artist: "光阴声景 · 原创环境音",
    source: "/audio/coast.wav",
    cover: "/images/coast.png",
  },
  {
    title: "慢下来的午后",
    artist: "光阴声景 · 原创环境音",
    source: "/audio/afternoon.wav",
    cover: "/images/window.png",
  },
];
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
  const audio = useRef<HTMLAudioElement>(null);
  const uploads = useRef<string[]>([]);
  const [tracks, setTracks] = useState(initialTracks);
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
        setError("暂时无法播放这首音乐。");
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
        setError("音频加载失败，请稍后重试。");
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
            setError("暂时无法加载音频，可导入本地音乐。");
          }}
        />
        {panelContainer &&
          createPortal(
            <AnimatePresence>
              {open && (
                <motion.section
                  layout
                  className="music-panel integrated"
                  data-custom-scroll="播放器"
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15, scale: 0.95 }}
                  transition={softSpring}
                  aria-label="光阴声景播放器"
                >
                  <div className="music-panel-top">
                    <span>
                      <Headphones size={13} />
                      给下一页一点背景声
                    </span>
                    <button
                      className="icon-button"
                      aria-label="收起播放器"
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
                      aria-label="播放进度"
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
                      aria-label="上一首"
                      onClick={() => change(-1)}
                    >
                      <SkipBack size={18} />
                    </button>
                    <motion.button
                      className="player-play"
                      aria-label={playing ? "暂停音乐" : "播放音乐"}
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
                      aria-label="下一首"
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
                      aria-label="音量"
                      onChange={(e) => setVolume(Number(e.target.value))}
                    />
                    <button
                      className="icon-button"
                      aria-label="查看播放列表"
                      onClick={() => setQueue((v) => !v)}
                    >
                      <ListMusic size={17} />
                    </button>
                    <label
                      className="icon-button upload-music"
                      title="导入本地音乐"
                    >
                      <Upload size={15} />
                      <input
                        aria-label="导入本地音乐"
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
                              artist: "本地音乐 · 仅本次浏览有效",
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
            aria-label={open ? "收起音乐播放器" : "展开音乐播放器"}
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
              <small>{playing ? "正在播放" : "听一点，慢一点"}</small>
            </span>
          </button>
          <button
            className="dock-play"
            aria-label={playing ? "暂停" : "播放"}
            onClick={toggle}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {open && (
            <button
              className="dock-close"
              aria-label="关闭播放器面板"
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
