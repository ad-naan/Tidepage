"use client";
import { motion, useReducedMotion } from "motion/react";
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
        transition={{ duration: reduced ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
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
