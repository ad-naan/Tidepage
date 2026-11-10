"use client";
import { motion } from "motion/react";
import { spring } from "@/shared/lib/motion";
import { MediaImage } from "@/shared/ui/image/MediaImage";
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
        <span className="record-label">
          {cover && (
            <MediaImage src={cover} alt="" sizes={large ? "100px" : "28px"} />
          )}
        </span>
      </span>
    </motion.span>
  );
}
export function Equalizer({ playing }: { playing: boolean }) {
  return (
    <span
      className="player-equalizer"
      data-playing={playing}
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <i key={i} />
      ))}
    </span>
  );
}
