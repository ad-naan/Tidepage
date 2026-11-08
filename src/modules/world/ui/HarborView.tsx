"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUp,
  DoorOpen,
  Flame,
  Gem,
  Sailboat,
  Camera,
  Compass,
  Hand,
  Moon,
  Shirt,
  Sun,
  Volume2,
  VolumeX,
  X,
  Armchair,
  Footprints,
  UsersRound,
  BookOpen,
  UserRound,
  Stamp,
  MessageCircle,
  Telescope,
} from "lucide-react";
import { useIdentity } from "@/modules/identity/ui/IdentityProvider";
import { apiSend, ApiClientError } from "@/shared/http/client";
import type { CoastIdentityTicket } from "@/shared/contracts/coast-memories";
import type { CoastPhoto } from "@/shared/contracts/coast-space";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Dialog } from "@/shared/ui/dialog/Dialog";
import { Anchor } from "@/shared/ui/link/Anchor";
import { Link } from "@/shared/i18n/navigation";
import { useNotice } from "@/shared/ui/feedback/NoticeProvider";
import {
  defaultAvatar,
  restoreAvatar,
  type AvatarPose,
} from "../domain/coast-avatar";
import {
  harborDestinations,
  type HarborPlace,
  type HarborDestination,
  type HarborInteraction,
} from "../domain/coast-harbor";
import { createSeaAudio } from "../runtime/coast-audio";
import type { HarborControls } from "../runtime/createHarborScene";
import { HarborWardrobe } from "./HarborWardrobe";
import { CoastRpcError, useCoastConnection } from "./useCoastConnection";
import { HarborSocial } from "./HarborSocial";
import styles from "./HarborView.module.css";
import { HarborGuide } from "./HarborGuide";
import { HarborSpeech, useHarborSpeech } from "./HarborSpeech";
import { HarborNearbySpeech } from "./HarborNearbySpeech";
import {
  emptyJourney,
  restoreJourney,
  interactJourney,
  type JourneyId,
} from "../domain/coast-journey";

export function HarborView({
  guideEnabled = false,
}: {
  guideEnabled?: boolean;
}) {
  const t = useTranslations("world.harbor");
  const world = useTranslations("world.ui");
  const notices = useTranslations("world.notices");
  const [journey, setJourney] = useState(emptyJourney);
  const [sailing, setSailing] = useState(false);
  const [nearbyJourney, setNearbyJourney] = useState<JourneyId | null>(null);
  const discover = useRef<(id: JourneyId) => void>(() => {});
  discover.current = (id) => {
    const result = interactJourney(journey, id, current.current.night);
    setJourney(result.journey);
    notify({
      title: notices(result.notice.key, { count: result.notice.count ?? 0 }),
      tone: "info",
    });
  };
  const { notify } = useNotice();
  const { principal, openLogin } = useIdentity();
  const reduced = useReducedMotion();
  const [appearance, setAppearance] = useState(defaultAvatar);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [night, setNight] = useState(false);
  const [studio, setStudio] = useState(false);
  const [help, setHelp] = useState(false);
  const [talking, setTalking] = useState(false);
  const [listening, setListening] = useState(false);
  const [company, setCompany] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [turtleNearby, setTurtleNearby] = useState(true);
  const [saying, setSaying] = useState(false);
  const speech = useHarborSpeech();
  const speechHost = useRef<HTMLDivElement>(null);
  const [lookingSky, setLookingSky] = useState(false);
  const [sound, setSound] = useState(false);
  const [pose, setPose] = useState<AvatarPose>("idle");
  const [place, setPlace] = useState<HarborPlace | null>(null);
  const [location, setLocation] = useState<HarborDestination | null>(null);
  const [interaction, setInteraction] = useState<HarborInteraction | null>(
    null,
  );
  const [photo, setPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [socialPanel, setSocialPanel] = useState<"company" | "journal" | null>(
    null,
  );
  const [memoryVersion, setMemoryVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [savedPhoto, setSavedPhoto] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<HarborControls | null>(null);
  const audio = useRef<ReturnType<typeof createSeaAudio> | null>(null);
  const mounted = useRef(false);
  const storageWarning = useRef(false);
  const current = useRef({
    appearance,
    journey,
    night,
    studio,
    talking,
    saying,
    listening,
    quiet,
    blocked: help || talking || saying || !!photo || !!socialPanel,
    reduced: !!reduced,
  });
  current.current = {
    appearance,
    journey,
    night,
    studio,
    talking,
    saying,
    listening,
    quiet,
    blocked: help || talking || saying || !!photo || !!socialPanel,
    reduced: !!reduced,
  };
  const network = useCoastConnection({
    active: ready && loaded && !failed,
    appearance,
    controls,
    onNight: setNight,
    onActionError: (code) =>
      notify({ title: t(`network.${code}`), tone: "info" }),
    getIdentityTicket: async () => {
      if (!principal) return null;
      try {
        return (
          await apiSend<CoastIdentityTicket>("/api/v1/world/ticket", "POST")
        ).ticket;
      } catch (error) {
        socialFailure(error);
        return null;
      }
    },
    onPhotoReady: captureTogether,
    onPhotoEnded: (state) =>
      notify({ title: t(`social.${state}`), tone: "info" }),
  });

  function socialFailure(error: unknown) {
    if (
      (error instanceof CoastRpcError && error.code === "AUTH_REQUIRED") ||
      (error instanceof ApiClientError && error.status === 401)
    ) {
      setSocialPanel(null);
      setPhoto(null);
      openLogin();
      return;
    }
    const code = error instanceof CoastRpcError ? error.code : "UNAVAILABLE";
    notify({ title: t(`social.errors.${code}`), tone: "error" });
  }
  async function saveMemory(
    request: { place: HarborPlace } | { photoId: string },
  ) {
    if (!principal) {
      setPhoto(null);
      openLogin();
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const receipt = await network.receipt(request);
      await apiSend("/api/v1/world/memories", "POST", { receipt });
      if (!mounted.current) return;
      setMemoryVersion((value) => value + 1);
      if ("photoId" in request) setSavedPhoto(request.photoId);
      notify({ title: t("social.saved"), tone: "success" });
    } catch (error) {
      if (mounted.current) socialFailure(error);
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  async function captureTogether(value: CoastPhoto) {
    if (!value.composition || !controls.current) return;
    setStudio(false);
    setHelp(false);
    setSocialPanel(null);
    setTalking(false);
    setSaying(false);
    setCapturing(true);
    try {
      const blob = await controls.current.captureTogether(value.composition);
      if (mounted.current) {
        setPhoto(URL.createObjectURL(blob));
        setPhotoId(value.id);
      }
    } catch {
      if (mounted.current) notify({ title: t("photoFailed"), tone: "error" });
    } finally {
      if (mounted.current) setCapturing(false);
    }
  }

  useEffect(() => {
    try {
      const savedJourney = localStorage.getItem("coast-journey-v1");
      if (savedJourney) setJourney(restoreJourney(JSON.parse(savedJourney)));
      const saved = localStorage.getItem("coast-avatar-v1");
      if (saved) setAppearance(restoreAvatar(JSON.parse(saved)));
    } catch {
      /* An unavailable or invalid saved outfit uses the default. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("coast-avatar-v1", JSON.stringify(appearance));
    } catch {
      if (!storageWarning.current) {
        storageWarning.current = true;
        notify({ title: t("storageFailed"), tone: "error" });
      }
    }
  }, [appearance, loaded, notify, t]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem("coast-journey-v1", JSON.stringify(journey));
    } catch {
      /* Exploration remains available without storage. */
    }
  }, [journey, loaded]);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const abort = new AbortController();
    import("../runtime/createHarborScene")
      .then(async ({ createHarborScene }) => {
        if (cancelled || !host.current) return;
        try {
          const scene = await createHarborScene({
            signal: abort.signal,
            host: host.current,
            speechHost: speechHost.current ?? undefined,
            state: () => current.current,
            onPlace: setPlace,
            onLocation: setLocation,
            onPose: setPose,
            onInteraction: setInteraction,
            onTravel: setSailing,
            onTalk: () => setTalking(true),
            onSay: () => setSaying(true),
            onSky: setLookingSky,
            onCompany: setCompany,
            onTurtleNearby: setTurtleNearby,
            onMoment: (moment) =>
              speech.speak("otter", t(`company.moments.${moment}`)),
            onNearbyJourney: setNearbyJourney,
            onJourney: (id) => discover.current(id),
            onNavigation: (reason) =>
              notify({ title: t(`travel.${reason}`), tone: "info" }),
            onError: () => setFailed(true),
          });
          if (cancelled) {
            scene.dispose();
            return;
          }
          controls.current = scene;
          setReady(true);
        } catch {
          if (!cancelled) setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      mounted.current = false;
      cancelled = true;
      abort.abort();
      controls.current?.dispose();
      controls.current = null;
    };
  }, []);
  useEffect(() => {
    if (!photo) return;
    return () => URL.revokeObjectURL(photo);
  }, [photo]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStudio(false);
        setHelp(false);
        setTalking(false);
        setListening(false);
        setSaying(false);
        if (!document.querySelector("dialog[open]"))
          requestAnimationFrame(() =>
            host.current?.parentElement?.focus({ preventScroll: true }),
          );
      }
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
      if (mounted.current) setSound(!sound);
    } catch {
      notify({ title: t("soundFailed"), tone: "error" });
    }
  }
  async function capture() {
    if (!controls.current || capturing) return;
    setCapturing(true);
    try {
      const blob = await controls.current.capture();
      if (mounted.current) {
        setPhoto(URL.createObjectURL(blob));
        setPhotoId(null);
      }
    } catch {
      if (mounted.current) notify({ title: t("photoFailed"), tone: "error" });
    } finally {
      if (mounted.current) setCapturing(false);
    }
  }
  return (
    <main
      className={styles.world}
      id="main-content"
      tabIndex={0}
      data-night={night}
      data-photo-active={
        network.photo?.state === "pending" ||
        network.photo?.state === "scheduled"
      }
      aria-label={t("region")}
    >
      <h1 className={styles.srOnly}>{t("title")}</h1>
      <div ref={host} className={styles.canvas} />
      <HarborSpeech
        host={speechHost}
        local={speech.lines}
        speech={network.speech}
        players={network.players}
        selfId={network.selfId}
        serverNow={network.serverNow}
        hidden={studio || help || !!photo || !!socialPanel}
        walk={(destination) => {
          setTalking(false);
          setListening(false);
          speech.clear();
          requestAnimationFrame(() => controls.current?.goTo(destination));
        }}
      />
      <div className={styles.topbar}>
        <Link href="/" className={styles.home} aria-label={world("exit")}>
          <ArrowLeft size={18} />
        </Link>
        <div className={styles.settings}>
          <IconButton
            aria-label={t("social.account")}
            onClick={() => {
              setTalking(false);
              setListening(false);
              setSaying(false);
              openLogin();
            }}
          >
            <UserRound size={18} />
          </IconButton>
          <IconButton
            aria-label={t("social.journal")}
            onClick={() => {
              setTalking(false);
              setListening(false);
              setSaying(false);
              setSocialPanel("journal");
            }}
          >
            <BookOpen size={18} />
          </IconButton>
          <IconButton
            aria-label={t("social.company")}
            title={t("social.company")}
            data-online={network.phase === "online"}
            onClick={() => {
              setTalking(false);
              setListening(false);
              setSaying(false);
              setSocialPanel("company");
            }}
          >
            <UsersRound size={18} />
            {network.phase === "online" && (
              <span className={styles.count} aria-hidden="true">
                {network.count}
              </span>
            )}
          </IconButton>
          <IconButton
            aria-label={sound ? world("soundOff") : world("soundOn")}
            aria-pressed={sound}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </IconButton>
          <IconButton
            aria-label={night ? world("sunset") : world("stars")}
            aria-pressed={night}
            disabled={network.phase === "online"}
            title={
              network.phase === "online" ? t("network.sharedTime") : undefined
            }
            onClick={() => setNight(!night)}
          >
            {night ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
          <IconButton
            aria-label={t("guide.title")}
            aria-expanded={help}
            onClick={() => {
              setStudio(false);
              setTalking(false);
              setListening(false);
              setSaying(false);
              setHelp(!help);
            }}
          >
            <Compass size={18} />
          </IconButton>
        </div>
      </div>
      {!ready && !failed && (
        <div className={styles.center} role="status">
          {world("loading")}
        </div>
      )}
      {failed && (
        <div className={styles.center} role="alert">
          <p>{world("fallback")}</p>
          <Button onClick={() => window.location.reload()}>
            {world("retry")}
          </Button>
          <Link href="/">{world("home")}</Link>
        </div>
      )}
      {ready && !failed && (
        <>
          <span className={styles.srOnly} role="status">
            {network.phase === "online"
              ? t("network.count", { count: network.count })
              : t(`network.${network.phase}`)}
          </span>
          {sailing && (
            <span className={styles.travelHint}>{t("travel.hint")}</span>
          )}
          {studio && (
            <HarborWardrobe
              appearance={appearance}
              onChange={setAppearance}
              onClose={() => setStudio(false)}
            />
          )}
          {!studio &&
            !help &&
            !talking &&
            !saying &&
            !socialPanel &&
            !photo && (
              <div
                className={styles.actions}
                role="group"
                aria-label={t("actions")}
              >
                <Button
                  disabled={sailing}
                  aria-label={t("dress")}
                  onClick={() => {
                    setHelp(false);
                    setStudio(true);
                  }}
                >
                  <Shirt size={18} />
                  <span>{t("dress")}</span>
                </Button>
                <Button
                  aria-label={t("wave")}
                  onClick={() => controls.current?.pose("wave")}
                >
                  <Hand size={18} />
                  <span>{t("wave")}</span>
                </Button>
                <Button
                  disabled={sailing}
                  aria-label={t(pose === "sit" ? "stand" : "sit")}
                  aria-pressed={pose === "sit"}
                  onClick={() =>
                    controls.current?.pose(pose === "sit" ? "idle" : "sit")
                  }
                >
                  {pose === "sit" ? (
                    <Footprints size={18} />
                  ) : (
                    <Armchair size={18} />
                  )}
                  <span>{t(pose === "sit" ? "stand" : "sit")}</span>
                </Button>
                <Button
                  aria-label={t("photo")}
                  onClick={capture}
                  busy={capturing}
                  disabled={network.photo?.state === "scheduled"}
                >
                  <Camera size={18} />
                  <span>{t("photo")}</span>
                </Button>
                <Button
                  disabled={sailing}
                  aria-label={t("jump")}
                  onClick={() => controls.current?.jump()}
                >
                  <ArrowUp size={18} />
                  <span>{t("jump")}</span>
                </Button>
                <Button
                  aria-label={t(lookingSky ? "returnView" : "lookSky")}
                  aria-pressed={lookingSky}
                  onClick={() => controls.current?.lookSky()}
                >
                  <Telescope size={18} />
                  <span>{t(lookingSky ? "returnView" : "lookSky")}</span>
                </Button>
                <Button
                  aria-label={t("speech.nearby")}
                  onClick={() => controls.current?.say()}
                >
                  <MessageCircle size={18} />
                  <span>{t("speech.nearby")}</span>
                </Button>
              </div>
            )}
          {nearbyJourney &&
            !interaction &&
            !studio &&
            !help &&
            !talking &&
            !saying &&
            !socialPanel &&
            !photo && (
              <Button
                className={styles.context}
                onClick={() => discover.current(nearbyJourney)}
              >
                <Gem size={19} />
                <kbd>{t("interact.key")}</kbd>
                <span>
                  {t("travel.discovery", {
                    place: t(`discoveries.${nearbyJourney}`),
                  })}
                </span>
              </Button>
            )}
          {interaction &&
            !studio &&
            !help &&
            !talking &&
            !saying &&
            !socialPanel &&
            !photo && (
              <Button
                className={styles.context}
                aria-label={t(`interact.${interaction}`)}
                onClick={() => controls.current?.interact()}
              >
                {interaction === "talk" ? (
                  <MessageCircle size={19} />
                ) : interaction === "door" ? (
                  <DoorOpen size={19} />
                ) : interaction === "hearth" ? (
                  <Flame size={19} />
                ) : interaction === "crystal" ? (
                  <Gem size={19} />
                ) : interaction === "sail" ? (
                  <Sailboat size={19} />
                ) : (
                  <Armchair size={19} />
                )}
                <kbd>{t("interact.key")}</kbd>
                <span>{t(`interact.${interaction}`)}</span>
              </Button>
            )}
          {help && (
            <section className={styles.guide} aria-label={t("guide.title")}>
              <div className={styles.panelHeading}>
                <h2>{t("guide.title")}</h2>
                <IconButton
                  aria-label={t("close")}
                  onClick={() => setHelp(false)}
                >
                  <X size={18} />
                </IconButton>
              </div>
              <p>{t("guide.move")}</p>
              <p>{t("guide.camera")}</p>
              <p>
                {t("travel.progress", { count: journey.fragments.length })}{" "}
                {journey.discovered
                  ? world("objectiveDiscovered")
                  : journey.beacon
                    ? world("objectiveGlow")
                    : journey.fragments.length === 3
                      ? world("objectiveBeacon")
                      : world("objectiveFragments")}
              </p>
              <div className={styles.location}>
                <span>{t(`places.${place ?? "bay"}.name`)}</span>
                <p>{t(`places.${place ?? "bay"}.description`)}</p>
                {place && (
                  <Button
                    busy={saving}
                    disabled={network.phase !== "online"}
                    onClick={() => saveMemory({ place })}
                  >
                    <Stamp size={15} />
                    {t("social.checkIn")}
                  </Button>
                )}
              </div>
              <p>{t("network.help")}</p>
              <nav aria-label={t("guide.destinations")}>
                {(Object.keys(harborDestinations) as HarborDestination[]).map(
                  (id) => (
                    <Button
                      key={id}
                      onClick={() => {
                        setHelp(false);
                        controls.current?.goTo(id);
                      }}
                    >
                      <Footprints size={15} />
                      {t(`destinations.${id}`)}
                    </Button>
                  ),
                )}
              </nav>
              <p className={styles.localNote}>{t("guide.host")}</p>
              <Button
                variant="quiet"
                onClick={() => {
                  setHelp(false);
                  requestAnimationFrame(() =>
                    controls.current?.meetCompanion(),
                  );
                }}
              >
                <MessageCircle size={16} />
                {t("companion.meet")}
              </Button>
              <Button
                variant="quiet"
                onClick={() => {
                  setHelp(false);
                  requestAnimationFrame(() =>
                    sailing
                      ? controls.current?.goTo("dock")
                      : controls.current?.voyage(),
                  );
                }}
              >
                {t(sailing ? "travel.returnRoute" : "voyage")}
              </Button>
            </section>
          )}
        </>
      )}
      <HarborGuide
        key={`guide:${principal?.id ?? "guest"}`}
        open={talking}
        enabled={guideEnabled}
        night={night}
        sailing={sailing}
        lookingSky={lookingSky}
        speech={speech}
        onListening={setListening}
        company={company}
        quiet={quiet}
        turtleNearby={turtleNearby}
        onCompany={() => {
          controls.current?.setCompany(!company);
          setTalking(false);
          setListening(false);
          requestAnimationFrame(() =>
            host.current?.parentElement?.focus({ preventScroll: true }),
          );
        }}
        onQuiet={() => {
          setQuiet(!quiet);
          setTalking(false);
          setListening(false);
          requestAnimationFrame(() =>
            host.current?.parentElement?.focus({ preventScroll: true }),
          );
        }}
        onSky={() => {
          setTalking(false);
          setListening(false);
          requestAnimationFrame(() => {
            if (!lookingSky) controls.current?.lookSky();
            host.current?.parentElement?.focus({ preventScroll: true });
          });
        }}
        onClose={() => {
          setTalking(false);
          setListening(false);
          requestAnimationFrame(() =>
            host.current?.parentElement?.focus({ preventScroll: true }),
          );
        }}
        place={location}
      />
      {saying && (
        <HarborNearbySpeech
          key={`nearby-speech:${principal?.id ?? "guest"}`}
          network={network}
          onClose={() => {
            setSaying(false);
            requestAnimationFrame(() =>
              host.current?.parentElement?.focus({ preventScroll: true }),
            );
          }}
        />
      )}
      <HarborSocial
        network={network}
        panel={socialPanel}
        onClose={() => setSocialPanel(null)}
        onError={socialFailure}
        version={memoryVersion}
      />
      {photo && (
        <Dialog title={t("photoTitle")} onClose={() => setPhoto(null)} wide>
          <img className={styles.photo} src={photo} alt={t("photoAlt")} />
          <p className={styles.photoCaption}>{t("photoCaption")}</p>
          <div className={styles.photoActions}>
            <Anchor
              href={photo}
              download="tidepage-coast.png"
              className={styles.download}
            >
              {t("download")}
            </Anchor>
            {photoId && (
              <Button
                busy={saving}
                disabled={savedPhoto === photoId}
                onClick={() => saveMemory({ photoId })}
              >
                {t(
                  savedPhoto === photoId
                    ? "social.alreadySaved"
                    : "social.savePhoto",
                )}
              </Button>
            )}
          </div>
        </Dialog>
      )}
    </main>
  );
}
