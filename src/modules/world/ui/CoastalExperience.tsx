"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/shared/i18n/navigation";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  Compass,
  Moon,
  Pause,
  Play,
  Sun,
  Volume2,
  VolumeX,
  X,
  Sparkles,
} from "lucide-react";
import { createSeaAudio } from "@/modules/world/runtime/coast-audio";
import {
  emptyJourney,
  interactJourney,
  journeyStops,
  restoreJourney,
  type Journey,
  type JourneyId,
} from "@/modules/world/domain/coast-journey";
import type { VoyageControls } from "../runtime/createCoastScene";
import styles from "./coast.module.css";

export function CoastalExperience() {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [night, setNight] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sound, setSound] = useState(false);
  const [help, setHelp] = useState(false);
  const [notice, setNotice] = useState("");
  const [nearby, setNearby] = useState<JourneyId | null>(null);
  const [journey, setJourney] = useState<Journey>(emptyJourney);
  const [loaded, setLoaded] = useState(false);
  const [onboarding, setOnboarding] = useState(true);
  const reduced = useReducedMotion();
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<VoyageControls | null>(null);
  const audio = useRef<ReturnType<typeof createSeaAudio> | null>(null);
  const current = useRef({ night, paused, help, journey, reduced: !!reduced });
  current.current = { night, paused, help, journey, reduced: !!reduced };
  const interaction = useRef(() => {});
  interaction.current = () => {
    if (!nearby || paused || help) return;
    const result = interactJourney(journey, nearby, night);
    setJourney(result.journey);
    setNotice(result.message);
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("coast-journey-v1");
      if (saved) setJourney(restoreJourney(JSON.parse(saved)));
    } catch {
      /* Storage is optional. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem("coast-journey-v1", JSON.stringify(journey));
      } catch {
        /* Keep progress in memory. */
      }
  }, [journey, loaded]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6200);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setOnboarding(false), 14000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    try { sessionStorage.setItem("coast-visited", "true"); } catch { /* Optional navigation hint. */ }
    let cancelled = false;
    import("../runtime/createCoastScene")
      .then(({ createCoastScene }) => {
        if (cancelled || !host.current) return;
        try {
          controls.current = createCoastScene({
            host: host.current,
            state: () => current.current,
            onNearby: setNearby,
            onInteract: () => interaction.current(),
            onReady: () => setReady(true),
            onError: () => setFailed(true),
          });
        } catch {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controls.current?.dispose();
      controls.current = null;
    };
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setHelp(false);
    };
    const visibility = () => {
      if (document.hidden) void audio.current?.suspend();
      else void audio.current?.resume().catch(() => setSound(false));
    };
    window.addEventListener("keydown", keydown);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keydown);
      document.removeEventListener("visibilitychange", visibility);
      audio.current?.dispose();
      audio.current = null;
    };
  }, []);
  async function toggleSound() {
    try {
      audio.current ??= createSeaAudio();
      await audio.current.setEnabled(!sound);
      setSound(!sound);
    } catch {
      setNotice("当前无法播放声音，可以继续探索。");
    }
  }
  const location = journeyStops.find((p) => p.id === nearby);
  const objective = journey.discovered
    ? "星落湾 · 已发现"
    : journey.beacon
      ? "夜里，跟随蓝色微光"
      : journey.fragments.length === 3
        ? "回到灯塔，点亮它"
        : "寻找散落的灯芯";
  const action =
    nearby === "articles"
      ? journey.beacon
        ? "查看灯塔"
        : "点亮灯塔"
      : nearby === "secret"
        ? "触碰星光"
        : ["quotes", "notes", "projects"].includes(nearby || "")
          ? "寻找灯芯"
          : "看看这里";
  return (
    <main
      id="main-content"
      className={`${styles.world} ${night ? styles.night : ""}`}
      aria-label="光阴海岸探索世界"
    >
      <div ref={host} className={styles.canvas} />
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.tools}>
        <Link href="/" aria-label="离开海岸，回到首页" title="回到首页">
          <ArrowLeft size={18} />
        </Link>
        <button
          onClick={() => setHelp(!help)}
          aria-expanded={help}
          aria-label="航行指南"
          title="航行指南"
        >
          <Compass size={19} />
        </button>
      </div>
      <div className={styles.settings}>
        <button
          onClick={toggleSound}
          aria-label={sound ? "关闭海浪声" : "开启海浪声"}
          aria-pressed={sound}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          onClick={() => setNight(!night)}
          aria-label={night ? "看一场日落" : "等星星亮起来"}
        >
          {night ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setPaused(!paused)}
          aria-label={paused ? "继续航行" : "暂停航行"}
          aria-pressed={paused}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
      </div>
      {!ready && !failed && (
        <div className={styles.loading} role="status">
          <i />
          海风正在抵达…
        </div>
      )}
      {failed && (
        <div className={styles.fallback}>
          <p>这台设备暂时无法绘制海岸。</p>
          <Link href="/">回到首页</Link>
        </div>
      )}
      {ready && !failed && (
        <>
          <div
            className={styles.quest}
            aria-label={`${objective}，已找到 ${journey.fragments.length} 枚灯芯`}
          >
            <span className={styles.fragments} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <i key={i} data-found={journey.fragments.length > i} />
              ))}
            </span>
            <span>{objective}</span>
          </div>
          {onboarding && !help && !nearby && (
            <div className={styles.onboarding}>
              点击海面启航 · 拖动环顾 · WASD 航行
              <button
                aria-label="关闭操作提示"
                onClick={() => setOnboarding(false)}
              >
                <X size={13} />
              </button>
            </div>
          )}
          {location && !help && !paused && (
            <button
              className={styles.interact}
              onClick={() => interaction.current()}
            >
              <span>{location.name}</span>
              <strong>
                <kbd>E</kbd>
                {action}
              </strong>
            </button>
          )}
          {paused && <div className={styles.paused}>已暂停</div>}
          {help && (
            <section className={styles.guide} aria-label="航行指南面板">
              <div>
                <Compass size={20} />
                <h1>航行指南</h1>
                <button
                  onClick={() => setHelp(false)}
                  aria-label="收起航行指南"
                >
                  <X size={18} />
                </button>
              </div>
              <p>海上的灯塔熄灭了。找到三枚灯芯，让光重新穿过夜色。</p>
              <dl>
                <dt>航行</dt>
                <dd>点击海面或岛屿，也可用 WASD / 方向键。</dd>
                <dt>观察</dt>
                <dd>拖动环顾，滚轮调整距离；I / K 仰俯，J / L 转向。</dd>
                <dt>探索</dt>
                <dd>靠岸后按 E，或点击出现的交互提示。</dd>
              </dl>
              <p className={styles.clue}>
                漂流瓶、小屋的窗边、工坊的木箱里……有光在等你。
              </p>
              <nav aria-label="辅助航线">
                {journeyStops
                  .filter((p) => p.id !== "secret" || (journey.beacon && night))
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        controls.current?.sailTo(p.id);
                        setHelp(false);
                      }}
                    >
                      {p.name}
                      <span>驶往</span>
                    </button>
                  ))}
              </nav>
              {journey.discovered && (
                <p className={styles.reward}>
                  <Sparkles size={16} />
                  已发现星落湾。你可以继续自由航行。
                </p>
              )}
              <button
                className={styles.restart}
                onClick={() => {
                  setJourney(emptyJourney);
                  setNight(false);
                  setNotice("新的航程，从码头开始。");
                  controls.current?.restart();
                  setHelp(false);
                }}
              >
                重新开始航程
              </button>
              <small>进度保存在此浏览器。音效默认关闭。</small>
            </section>
          )}
        </>
      )}
      <div
        className={styles.notice}
        role="status"
        aria-live="polite"
        data-visible={!!notice}
      >
        {notice}
      </div>
    </main>
  );
}
