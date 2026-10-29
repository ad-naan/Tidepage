"use client";
import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/shared/lib/motion";
export function PlayerRecord({
  large = false,
  playing,
  cover,
}: {
  large?: boolean;
  playing: boolean;
  cover: string;
}) {
  return (
    <motion.span
      layoutId="player-record"
      className={`shared-record ${large ? "large" : "small"}`}
      transition={spring}
      style={{ borderRadius: "50%" }}
    >
      <span
        className="record-disc"
        style={{ animationPlayState: playing ? "running" : "paused" }}
      >
        <span
          className="record-label"
          style={{ backgroundImage: `url(${cover})` }}
        />
      </span>
    </motion.span>
  );
}
export function Equalizer({ playing }: { playing: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className="player-equalizer" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <motion.i
          key={i}
          animate={
            playing && !reduce
              ? { height: [4, 13 - i, 6 + i, 15, 4] }
              : { height: [5, 10, 13, 7][i] }
          }
          transition={
            playing && !reduce
              ? {
                  duration: 0.9 + i * 0.11,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : spring
          }
        />
      ))}
    </span>
  );
}
