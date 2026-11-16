"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import {
  SeasonalMark,
  type SeasonalMarkKind,
} from "@/shared/ui/drawing/CoastalMarks";
import type { Season } from "@/shared/lib/seasonal-atmosphere";
import styles from "./SeasonalMatter.module.css";

const leaves = [
  { x: 5, phase: 0.12, duration: 31, size: 25, turn: -24 },
  { x: 92, phase: 0.38, duration: 37, size: 22, turn: 28 },
  { x: 31, phase: 0.66, duration: 35, size: 28, turn: -42 },
  { x: 67, phase: 0.86, duration: 29, size: 24, turn: 18 },
  { x: 15, phase: 0.17, duration: 33, size: 26, turn: -18 },
  { x: 80, phase: 0.45, duration: 39, size: 21, turn: 42 },
  { x: 45, phase: 0.83, duration: 34, size: 23, turn: 12 },
  { x: 57, phase: 0.58, duration: 38, size: 22, turn: -32 },
  { x: 22, phase: 0.27, duration: 36, size: 30, turn: 22 },
  { x: 73, phase: 0.73, duration: 32, size: 27, turn: -15 },
  { x: 38, phase: 0.48, duration: 41, size: 20, turn: -36 },
  { x: 61, phase: 0.08, duration: 35, size: 25, turn: 34 },
  { x: 9, phase: 0.91, duration: 33, size: 28, turn: -12 },
  { x: 87, phase: 0.52, duration: 40, size: 19, turn: 28 },
  { x: 49, phase: 0.04, duration: 30, size: 26, turn: -30 },
  { x: 28, phase: 0.31, duration: 37, size: 29, turn: 16 },
  { x: 53, phase: 0.76, duration: 39, size: 23, turn: 38 },
  { x: 95, phase: 0.95, duration: 34, size: 24, turn: -26 },
];

const seasonalKinds: Record<Season, readonly SeasonalMarkKind[]> = {
  spring: ["petal", "willow", "birch", "petal", "birch", "willow"],
  summer: ["willow", "oak", "birch", "willow", "birch"],
  autumn: ["maple", "ginkgo", "oak", "maple", "birch", "ginkgo", "willow"],
  winter: ["snow"],
};

function kind(season: Season, index: number): SeasonalMarkKind {
  const kinds = seasonalKinds[season];
  return kinds[index % kinds.length];
}

export function SeasonalMatter({
  season,
  running,
}: {
  season: Season;
  running: boolean;
}) {
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const responses = useRef(
    leaves.map(() => ({ x: 0, y: 0, angle: 0, tx: 0, ty: 0, ta: 0 })),
  );
  useEffect(() => {
    if (!running) return;
    let frame = 0;
    let pending: { x: number; y: number; wind: number } | null = null;
    let lastX: number | undefined;
    const poses = responses.current;
    const paint = () => {
      frame = 0;
      if (pending) {
        const pointer = pending;
        // Falling only drifts a few pixels horizontally. Measure nearby leaves
        // rather than synchronizing every animated layer with the main thread.
        const bounds = items.current.map((element, index) =>
          Math.abs((leaves[index].x / 100) * innerWidth - pointer.x) < 200
            ? element?.getBoundingClientRect()
            : undefined,
        );
        bounds.forEach((bounds, index) => {
          if (!bounds || !bounds.width) return;
          const dx = bounds.x + bounds.width / 2 - pointer.x;
          const dy = bounds.y + bounds.height / 2 - pointer.y;
          const distance = Math.hypot(dx, dy);
          const weight = Math.max(0, 1 - distance / 160) ** 2;
          const length = Math.max(1, distance);
          poses[index].tx = ((dx / length) * 42 + pointer.wind * 0.6) * weight;
          poses[index].ty = (dy / length) * 28 * weight;
          poses[index].ta =
            Math.max(-32, Math.min(32, pointer.wind * 1.4 + dx * 0.12)) *
            weight;
        });
        pending = null;
      }
      let moving = false;
      poses.forEach((pose, index) => {
        if (
          Math.abs(pose.x) +
            Math.abs(pose.y) +
            Math.abs(pose.angle) +
            Math.abs(pose.tx) +
            Math.abs(pose.ty) +
            Math.abs(pose.ta) <
          0.01
        )
          return;
        pose.x += (pose.tx - pose.x) * 0.16;
        pose.y += (pose.ty - pose.y) * 0.16;
        pose.angle += (pose.ta - pose.angle) * 0.16;
        pose.tx *= 0.95;
        pose.ty *= 0.95;
        pose.ta *= 0.95;
        const response = items.current[index]
          ?.firstElementChild as HTMLElement | null;
        if (response)
          response.style.transform = `translate3d(${pose.x.toFixed(2)}px,${pose.y.toFixed(2)}px,0) rotate(${pose.angle.toFixed(2)}deg)`;
        if (Math.abs(pose.x) + Math.abs(pose.y) + Math.abs(pose.angle) > 0.05)
          moving = true;
      });
      if (moving) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pending = {
        x: event.clientX,
        y: event.clientY,
        wind:
          lastX === undefined
            ? 0
            : Math.max(-24, Math.min(24, event.clientX - lastX)),
      };
      lastX = event.clientX;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, [running, season]);

  return (
    <div className={styles.matter} data-season={season}>
      {leaves.map((leaf, index) => (
        <span
          key={index}
          ref={(node) => {
            items.current[index] = node;
          }}
          className={styles.fall}
          data-seasonal-item=""
          data-tone={index % 3}
          data-kind={kind(season, index)}
          style={
            {
              "--leaf-x": `${leaf.x}%`,
              "--leaf-rest": `${leaf.phase * 100}vh`,
              "--leaf-duration": `${leaf.duration}s`,
              "--leaf-delay": `${-leaf.phase * leaf.duration}s`,
              "--leaf-size": `${season === "winter" ? leaf.size * 0.62 : leaf.size}px`,
              "--leaf-angle": `${leaf.turn}deg`,
              "--leaf-flutter": `${5.1 + (index % 4) * 1.3}s`,
            } as CSSProperties
          }
        >
          <span className={styles.response}>
            <span className={styles.flutter}>
              <SeasonalMark
                kind={kind(season, index)}
                className={styles.form}
              />
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
