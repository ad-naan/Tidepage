"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { HeroSketch } from "@/modules/world/ui/CoastIllustration";
import styles from "./HomeHero.module.css";

const modes = ["intro", "theme"] as const;
type Mode = (typeof modes)[number];
const controls: Record<Mode, { next: Mode; label: "reveal" | "restore" }> = {
  intro: { next: "theme", label: "reveal" },
  theme: { next: "intro", label: "restore" },
};

export function HomeHero() {
  const t = useTranslations("home");
  const [mode, setMode] = useState<Mode>("intro");
  const reduce = useReducedMotion();
  const id = useId();
  const transition = {
    duration: reduce ? 0 : 0.68,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  function appearance(panel: Mode) {
    const active = mode === panel;
    let y = 0;
    let filter = "blur(0px)";
    if (!active && !reduce) {
      y = panel === "intro" ? -12 : 12;
      filter = "blur(5px)";
    }
    return { opacity: active ? 1 : 0, y, filter };
  }

  return (
    <section className="hero">
      <div className={`hero-copy ${styles.copy}`} data-hero-mode={mode}>
        <div className={styles.greeting}>
          <span>{t("hero.greeting")}</span>
          <button
            type="button"
            className={styles.spark}
            onClick={() => setMode(controls[mode].next)}
            aria-label={t(`hero.${controls[mode].label}`)}
            aria-pressed={mode === "theme"}
            aria-controls={id}
          >
            <motion.span
              aria-hidden="true"
              animate={{ rotate: mode === "theme" ? 180 : 0 }}
              transition={transition}
            >
              ✳
            </motion.span>
            <span className={styles.hint} aria-hidden="true">
              {t(`hero.${controls[mode].label}`)}
            </span>
          </button>
        </div>
        <div id={id} aria-live="polite" aria-atomic="true">
          <h1 className={styles.title}>
            {modes.map((panel) => (
              <motion.span
                key={panel}
                className={styles.titlePanel}
                data-panel={panel}
                aria-hidden={mode !== panel}
                initial={false}
                animate={appearance(panel)}
                transition={transition}
              >
                <span>{t(`hero.${panel}.line1`)}</span>
                <span className={styles.lastLine}>
                  {t(`hero.${panel}.line2`)}
                  {panel === "theme" && (
                    <svg viewBox="0 0 430 30" fill="none" aria-hidden="true">
                      <motion.path
                        d="M3 22Q167-9 424 10M111 27l49-22-17 16 57-16"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        initial={false}
                        animate={{ pathLength: mode === "theme" ? 1 : 0 }}
                        transition={{
                          ...transition,
                          delay: mode === "theme" && !reduce ? 0.18 : 0,
                        }}
                      />
                    </svg>
                  )}
                </span>
              </motion.span>
            ))}
          </h1>
          <div className={styles.introduction}>
            {modes.map((panel) => (
              <motion.p
                key={panel}
                aria-hidden={mode !== panel}
                initial={false}
                animate={appearance(panel)}
                transition={transition}
              >
                {t(`hero.${panel}.description`)}
              </motion.p>
            ))}
          </div>
        </div>
        <Link className="explore-link" href="/articles">
          {t("articles")}
          <ArrowRight size={22} />
        </Link>
      </div>
      <HeroSketch quiet onWish={() => setMode("theme")} />
    </section>
  );
}
