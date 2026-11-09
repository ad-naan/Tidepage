"use client";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/shared/lib/motion";
import { PlayerRecord } from "./PlayerRecord";
import styles from "./RecordDeck.module.css";

/** Record and tonearm share one coordinate system at every viewport size. */
export function RecordDeck({
  playing,
  cover,
}: {
  playing: boolean;
  cover: string;
}) {
  const reduced = useReducedMotion();
  return (
    <div className={styles.deck} aria-hidden="true">
      <span className={styles.record}>
        <PlayerRecord large playing={playing} cover={cover} />
      </span>
      <motion.span
        className={styles.arm}
        animate={{ rotate: playing ? 22 : 0 }}
        transition={reduced ? { duration: 0 } : softSpring}
      >
        <span className={styles.shaft} />
        <span className={styles.cartridge}>
          <i className={styles.stylus} />
        </span>
      </motion.span>
      <span className={styles.pivot} />
    </div>
  );
}
