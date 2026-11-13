"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { BackgroundMotion } from "@/shared/ui/preferences/useBackgroundMotion";
import { useRelativeClock } from "@/shared/hooks/useRelativeClock";
import { seasonalAtmosphere } from "@/shared/lib/seasonal-atmosphere";
import { SeasonalMatter } from "./SeasonalMatter";
import styles from "./SiteAtmosphere.module.css";

const motionQuery = "(prefers-reduced-motion: reduce), (forced-colors: active)";
function subscribeMotion(listener: () => void) {
  const media = matchMedia(motionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

export function SiteAtmosphere({
  motion,
  reading,
}: {
  motion: BackgroundMotion;
  reading: boolean;
}) {
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia(motionQuery).matches,
    () => true,
  );
  const scene = useRef<HTMLDivElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const now = useRelativeClock(true);
  const atmosphere = now === null ? null : seasonalAtmosphere(now);
  const running = !!atmosphere && motion === "flowing" && visible && !reduced;
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const target = { ...position.current };
    const paint = () => {
      frame = 0;
      const current = position.current;
      current.x += (target.x - current.x) * 0.1;
      current.y += (target.y - current.y) * 0.1;
      if (scene.current)
        scene.current.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0)`;
      if (
        Math.abs(target.x - current.x) + Math.abs(target.y - current.y) >
        0.05
      )
        frame = requestAnimationFrame(paint);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      target.x =
        Math.max(-0.5, Math.min(0.5, event.clientX / innerWidth - 0.5)) * -24;
      target.y =
        Math.max(-0.5, Math.min(0.5, event.clientY / innerHeight - 0.5)) * -16;
      schedule();
    };
    const leave = (event: PointerEvent) => {
      if (event.relatedTarget) return;
      target.x = 0;
      target.y = 0;
      schedule();
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerout", leave, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerout", leave);
    };
  }, [running]);
  return (
    <div
      className={styles.atmosphere}
      data-running={running}
      data-reading={reading}
      data-season={atmosphere?.season}
      data-daylight={atmosphere?.daylight}
      aria-hidden="true"
    >
      <div ref={scene} className={styles.scene}>
        <div className={styles.sunlight} />
        <div className={styles.mist} />
        <div className={styles.tide} />
      </div>
      {atmosphere && (
        <SeasonalMatter season={atmosphere.season} running={running} />
      )}
    </div>
  );
}
