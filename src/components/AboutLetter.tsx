"use client";
import { Link } from "@/shared/i18n/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { ArrowRight, X } from "lucide-react";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { softSpring, spring } from "@/shared/lib/motion";

/** A discoverable foreword, kept away from the homepage's primary reading action. */
export function AboutLetter() {
  const { open, toggle, setOpen, ref } = useDisclosure("about-letter");
  const t = useTranslations("letter");
  const greeting = useTranslations("home");
  return (
    <div className="about-letter-anchor" ref={ref}>
      <motion.button
        className={`shore-envelope ${open ? "is-open" : ""}`}
        aria-label={t("open")}
        aria-expanded={open}
        aria-controls="about-foreword"
        onClick={toggle}
        whileHover={{ y: -4, rotate: -5 }}
        whileTap={{ scale: 0.92 }}
        transition={spring}
      >
        <svg viewBox="0 0 44 34" fill="none" aria-hidden="true">
          <path
            d="m5 9 17-8 17 8v21H5Z"
            fill="var(--letter-paper)"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <motion.path
            d="m5 10 17 11 17-11"
            stroke="currentColor"
            strokeWidth="1.1"
            animate={{ opacity: open ? 0 : 1 }}
          />
          <path
            d="m5 30 13-13m21 13L26 17"
            stroke="currentColor"
            strokeWidth=".8"
            opacity=".65"
          />
          <circle cx="22" cy="20" r="3" fill="var(--accent)" opacity=".8" />
        </svg>
        <span className="envelope-discovery">{t("discovery")}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.aside
            id="about-foreword"
            className="about-letter-sheet"
            initial={{ opacity: 0, y: 18, rotate: -3, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, rotate: 2, scale: 0.94 }}
            transition={softSpring}
          >
            <div className="letter-paper-fold" aria-hidden="true" />
            <div className="letter-topline">
              <span>{t("eyebrow")}</span>
              <button aria-label={t("close")} onClick={() => setOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <h2>{greeting("greeting")}</h2>
            <p>{t("body")}</p>
            <span className="letter-signature">adnaan</span>
            <Link href="/about" onClick={() => setOpen(false)}>
              {t("link")} <ArrowRight size={15} />
            </Link>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
