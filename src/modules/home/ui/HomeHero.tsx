"use client";

import { Button } from "@/shared/ui/button/Button";
import { useId, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { HeroSketch } from "@/modules/world/ui/CoastIllustration";
import { ProfileLinks } from "./ProfileLinks";
import { AuthorSignature } from "@/modules/identity/ui/AuthorSignature";
import type { HomeCopy } from "@/modules/site-settings/domain/identity";
import { softSpring, surfaceSpring } from "@/shared/lib/motion";
import styles from "./HomeHero.module.css";

const modes = ["intro", "theme"] as const;
type Mode = (typeof modes)[number];
const controls: Record<Mode, { next: Mode; label: "reveal" | "restore" }> = {
  intro: { next: "theme", label: "reveal" },
  theme: { next: "intro", label: "restore" },
};

export function HomeHero({ copy }: { copy: HomeCopy }) {
  const t = useTranslations("home");
  const [mode, setMode] = useState<Mode>("intro");
  const reduce = useReducedMotion();
  const id = useId();
  const transition = reduce
    ? { duration: 0 }
    : {
        y: softSpring,
        opacity: { duration: 0.23, ease: "easeOut" as const },
      };

  function appearance(panel: Mode) {
    const active = mode === panel;
    return {
      opacity: active ? 1 : 0,
      y: active || reduce ? 0 : panel === "intro" ? -8 : 8,
    };
  }

  return (
    <section className="hero">
      <div className={`hero-copy ${styles.copy}`} data-hero-mode={mode}>
        <div className={styles.greeting}>
          <span>{t("hero.greeting")}</span>
          <Button
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
              transition={reduce ? { duration: 0 } : surfaceSpring}
            >
              ✳
            </motion.span>
            <span className={styles.hint} aria-hidden="true">
              {t(`hero.${controls[mode].label}`)}
            </span>
          </Button>
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
                <span>
                  {panel === "intro" ? (
                    <AuthorSignature size="hero" mark name={copy.name} />
                  ) : (
                    t(`hero.${panel}.line1`)
                  )}
                </span>
                <span className={styles.lastLine}>
                  {panel === "intro" && copy.heading
                    ? copy.heading
                    : t(`hero.${panel}.line2`)}
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
                          duration: reduce ? 0 : 0.46,
                          ease: "easeOut",
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
                {panel === "intro" && copy.description
                  ? copy.description
                  : t(`hero.${panel}.description`)}
              </motion.p>
            ))}
          </div>
        </div>
        <div className={styles.connections}>
          <Link className={styles.writingLink} href="/articles">
            {t("articles")}
            <ArrowRight size={15} />
          </Link>
          <span className={styles.connectionDivider} aria-hidden="true">
            /
          </span>
          <ProfileLinks links={copy.links} />
        </div>
      </div>
      <HeroSketch />
    </section>
  );
}
