"use client";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/shared/i18n/navigation";
import { useMessages, useTranslations } from "next-intl";
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
  type JourneyNotice,
} from "@/modules/world/domain/coast-journey";
import type { VoyageControls } from "../runtime/createCoastScene";
import styles from "./coast.module.css";

export function CoastalExperience() {
  const ui = useTranslations("world.ui");
  const notices = useTranslations("world.notices");
  const places = useMessages().world.places;
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
    setNotice(journeyNotice(result.notice));
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
      setNotice(notices("soundFail"));
    }
  }
  /** Domain notices carry keys; map them onto the message catalog. */
  function journeyNotice(notice: JourneyNotice) {
    switch (notice.key) {
      case "found":
        return notices("found", { count: notice.count ?? 0 });
      case "complete":
        return notices("complete");
      case "beaconDark":
        return notices("beaconDark");
      case "beaconLit":
        return notices("beaconLit");
      case "secret":
        return notices("secret");
      case "otter":
        return notices("otter");
      case "wind":
        return notices("wind");
      default:
        return notices("kept");
    }
  }
  const location = journeyStops.find((p) => p.id === nearby);
  const objective = journey.discovered
    ? ui("objectiveDiscovered")
    : journey.beacon
      ? ui("objectiveGlow")
      : journey.fragments.length === 3
        ? ui("objectiveBeacon")
        : ui("objectiveFragments");
  const action =
    nearby === "articles"
      ? journey.beacon
        ? ui("viewBeacon")
        : ui("lightBeacon")
      : nearby === "secret"
        ? ui("touchStars")
        : ["quotes", "notes", "projects"].includes(nearby || "")
          ? ui("findFragment")
          : ui("lookAround");
  return (
    <main
      id="main-content"
      className={`${styles.world} ${night ? styles.night : ""}`}
      aria-label={ui("region")}
    >
      <div ref={host} className={styles.canvas} />
      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.tools}>
        <Link href="/" aria-label={ui("exit")} title={ui("home")}>
          <ArrowLeft size={18} />
        </Link>
        <button
          onClick={() => setHelp(!help)}
          aria-expanded={help}
          aria-label={ui("guide")}
          title={ui("guide")}
        >
          <Compass size={19} />
        </button>
      </div>
      <div className={styles.settings}>
        <button
          onClick={toggleSound}
          aria-label={sound ? ui("soundOff") : ui("soundOn")}
          aria-pressed={sound}
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <button
          onClick={() => setNight(!night)}
          aria-label={night ? ui("sunset") : ui("stars")}
        >
          {night ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={() => setPaused(!paused)}
          aria-label={paused ? ui("resume") : ui("pause")}
          aria-pressed={paused}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />}
        </button>
      </div>
      {!ready && !failed && (
        <div className={styles.loading} role="status">
          <i />
          {ui("loading")}
        </div>
      )}
      {failed && (
        <div className={styles.fallback}>
          <p>{ui("fallback")}</p>
          <Link href="/">{ui("home")}</Link>
        </div>
      )}
      {ready && !failed && (
        <>
          <div
            className={styles.quest}
            aria-label={ui("quest", {
              objective,
              count: journey.fragments.length,
            })}
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
              {ui("onboarding")}
              <button
                aria-label={ui("closeHint")}
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
          {paused && <div className={styles.paused}>{ui("paused")}</div>}
          {help && (
            <section className={styles.guide} aria-label={ui("guidePanel")}>
              <div>
                <Compass size={20} />
                <h1>{ui("guide")}</h1>
                <button
                  onClick={() => setHelp(false)}
                  aria-label={ui("collapseGuide")}
                >
                  <X size={18} />
                </button>
              </div>
              <p>{ui("guideIntro")}</p>
              <dl>
                <dt>{ui("sail")}</dt>
                <dd>{ui("sailHint")}</dd>
                <dt>{ui("look")}</dt>
                <dd>{ui("lookHint")}</dd>
                <dt>{ui("explore")}</dt>
                <dd>{ui("exploreHint")}</dd>
              </dl>
              <p className={styles.clue}>{ui("clue")}</p>
              <nav aria-label={ui("routes")}>
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
                      {places[p.id].name}
                      <span>{ui("sailTo")}</span>
                    </button>
                  ))}
              </nav>
              {journey.discovered && (
                <p className={styles.reward}>
                  <Sparkles size={16} />
                  {ui("reward")}
                </p>
              )}
              <button
                className={styles.restart}
                onClick={() => {
                  setJourney(emptyJourney);
                  setNight(false);
                  setNotice(notices("restart"));
                  controls.current?.restart();
                  setHelp(false);
                }}
              >
                {ui("restart")}
              </button>
              <small>{ui("progressNote")}</small>
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
