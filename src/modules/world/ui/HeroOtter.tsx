"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useInView } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, Feather, Sailboat, X } from "lucide-react";
import { siteAssets } from "@/shared/config/assets";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { Link } from "@/shared/i18n/navigation";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { AnchoredPanel } from "@/shared/ui/overlay/AnchoredPanel";
import { OverlayScope } from "@/shared/ui/overlay/OverlayScope";
import { CoastGlyph } from "@/shared/ui/drawing/CoastalMarks";
import { otterLook } from "../domain/hero-otter-rig";
import type { HeroOtterController } from "../runtime/createHeroOtter";
import animation from "@/modules/world/domain/hero-otter-animation.json";
import styles from "./HeroOtter.module.css";

const destinations = [
  { id: "articles", href: "/articles", Icon: BookOpen },
  { id: "notes", href: "/notes", Icon: Feather },
  { id: "coast", href: "/explore", Icon: Sailboat },
] as const;
type Destination = (typeof destinations)[number]["id"];
const owner = "home-otter";
function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

export function HeroOtter() {
  const t = useTranslations("sketch.otter");
  const sketch = useTranslations("sketch");
  const { open, setOpen, ref } = useDisclosure(owner);
  const id = useId();
  const artwork = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const controller = useRef<HeroOtterController | null>(null);
  const point = useRef({ x: 0, y: 0 });
  const focusPanel = useRef(false);
  const [requested, setRequested] = useState(false);
  const [ready, setReady] = useState(false);
  const [greeting, setGreeting] = useState(0);
  const [destination, setDestination] = useState<Destination | null>(null);
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)", true);
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const inView = useInView(artwork);
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const active = inView && visible && !reduced && fine;
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!open || !focusPanel.current) return;
    document.getElementById(id)?.querySelector<HTMLAnchorElement>("a")?.focus();
    focusPanel.current = false;
  }, [open, greeting, id]);

  useEffect(() => {
    if (!requested || reduced || !fine || !canvas.current) return;
    const abort = new AbortController();
    const element = canvas.current;
    void import("../runtime/createHeroOtter")
      .then(({ createHeroOtter }) =>
        createHeroOtter(element, siteAssets.heroOtterStill, abort.signal),
      )
      .then((runtime) => {
        if (abort.signal.aborted) {
          runtime.destroy();
          return;
        }
        controller.current = runtime;
        setReady(true);
        if (activeRef.current) runtime.look(point.current);
      })
      .catch(() => {
        // The original artwork and exploration links remain usable without WebGL.
      });
    return () => {
      abort.abort();
      controller.current?.destroy();
      controller.current = null;
      setReady(false);
    };
  }, [requested, reduced, fine]);

  useEffect(() => {
    if (!active || !artwork.current) {
      controller.current?.pause();
      return;
    }
    let bounds = artwork.current.getBoundingClientRect();
    let dirty = false;
    const invalidate = () => {
      dirty = true;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !artwork.current) return;
      if (dirty) {
        bounds = artwork.current!.getBoundingClientRect();
        dirty = false;
      }
      const dx = event.clientX - (bounds.left + bounds.width * 0.65);
      const dy = event.clientY - (bounds.top + bounds.height * 0.38);
      if (!requested && Math.hypot(dx, dy) > 260) return;
      point.current = otterLook(
        dx / Math.max(1, bounds.width * 2),
        dy / Math.max(1, bounds.height * 2),
      );
      if (!requested) setRequested(true);
      controller.current?.look(point.current);
    };
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      point.current = { x: 0, y: 0 };
      controller.current?.look(point.current);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave, { passive: true });
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    const resize = new ResizeObserver(invalidate);
    resize.observe(artwork.current);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      resize.disconnect();
      controller.current?.pause();
    };
  }, [active, requested]);

  function greet(keyboard = false) {
    focusPanel.current = keyboard;
    window.dispatchEvent(
      new CustomEvent("garden-disclosure", { detail: owner }),
    );
    setGreeting((count) => count + 1);
    setDestination(null);
    setOpen(true);
    if (active) setRequested(true);
  }
  return (
    <OverlayScope owner={owner}>
      <div ref={ref} className={styles.companion}>
        <div
          ref={artwork}
          className={styles.artwork}
          data-renderer={ready ? "pixi" : "static"}
          data-otter-artwork=""
        >
          <OtterArtwork playId={greeting} reducedMotion={reduced} />
          <div ref={canvas} className={styles.canvas} aria-hidden="true" />
        </div>
        <Button
          ref={setAnchor}
          className={styles.trigger}
          aria-label={sketch("greet")}
          aria-expanded={open}
          aria-controls={id}
          onClick={(event) => greet(event.detail === 0)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowDown") return;
            event.preventDefault();
            greet(true);
          }}
          pressEffect={false}
        >
          <span className={styles.hint} aria-hidden="true">
            {t("hint")}
          </span>
        </Button>
        <AnchoredPanel
          open={open}
          anchor={anchor}
          id={id}
          label={t("title")}
          width={320}
          align="center"
          placement="auto"
          gap={6}
          surfaceStyle="paper"
          className={styles.panel}
        >
          <div className={styles.heading}>
            <CoastGlyph kind="shell" />
            <span>{t("title")}</span>
            <IconButton aria-label={t("close")} onClick={() => setOpen(false)}>
              <X size={15} />
            </IconButton>
          </div>
          <p className={styles.reply} aria-live="polite">
            {destination
              ? t(`destinations.${destination}.reply`)
              : t(greeting > 1 ? "again" : "hello")}
          </p>
          <nav
            className={styles.destinations}
            aria-label={t("destinationsLabel")}
            onPointerLeave={() => setDestination(null)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setDestination(null);
            }}
          >
            {destinations.map(({ id: key, href, Icon }) => (
              <Link
                key={key}
                href={href}
                prefetch={false}
                onPointerEnter={() => setDestination(key)}
                onFocus={() => setDestination(key)}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{t(`destinations.${key}.label`)}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            ))}
          </nav>
        </AnchoredPanel>
      </div>
    </OverlayScope>
  );
}

/** Keep the decoded artwork mounted; playback changes only the sprite window. */
function OtterArtwork({
  playId,
  reducedMotion,
}: {
  playId: number;
  reducedMotion: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [greetReady, setGreetReady] = useState(false);
  const [frame, setFrame] = useState(-1);

  useEffect(() => {
    if (!playId) return;
    let active = true;
    const image = new Image();
    const markReady = reducedMotion ? setGreetReady : setReady;
    markReady(false);
    image.src = reducedMotion
      ? siteAssets.heroOtterGreet
      : siteAssets.heroOtterSprite;
    // An SVG image can finish loading before hydration attaches onLoad.
    void image.decode().then(
      () => active && markReady(true),
      () => active && markReady(false),
    );
    return () => {
      active = false;
    };
  }, [reducedMotion, Boolean(playId)]);

  useEffect(() => {
    setFrame(-1);
    if (!playId || !(reducedMotion ? greetReady : ready)) return;

    setFrame(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    animation.durations.forEach((duration, index) => {
      if (index && !reducedMotion)
        timers.push(setTimeout(() => setFrame(index), elapsed));
      elapsed += duration;
    });
    timers.push(setTimeout(() => setFrame(-1), elapsed));
    return () => timers.forEach(clearTimeout);
  }, [playId, ready, greetReady, reducedMotion]);

  const waving = !reducedMotion && ready && frame >= 0;
  const greeting = reducedMotion && greetReady && frame >= 0;

  return (
    <svg
      className={styles.fallback}
      viewBox="0 0 256 256"
      aria-hidden="true"
      data-otter-pose={waving ? "wave" : greeting ? "greet" : "rest"}
      data-otter-frame={frame}
    >
      <image
        href={siteAssets.heroOtterStill}
        width="256"
        height="256"
        preserveAspectRatio="xMidYMid meet"
        opacity={waving || greeting ? 0 : 1}
      />
      <svg
        width="256"
        height="256"
        viewBox={`0 0 ${animation.width} ${animation.height}`}
        overflow="hidden"
        opacity={waving ? 1 : 0}
      >
        <image
          href={
            !playId || reducedMotion ? undefined : siteAssets.heroOtterSprite
          }
          x={-Math.max(0, frame) * animation.width}
          width={animation.width * animation.durations.length}
          height={animation.height}
        />
      </svg>
      <image
        href={playId && reducedMotion ? siteAssets.heroOtterGreet : undefined}
        width="256"
        height="256"
        preserveAspectRatio="xMidYMid meet"
        opacity={greeting ? 1 : 0}
      />
    </svg>
  );
}
