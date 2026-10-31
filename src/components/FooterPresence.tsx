"use client";
import { useId } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Users, X } from "lucide-react";
import { useDisclosure } from "@/shared/hooks/useDisclosure";
import { VisitorStatsPanel } from "./VisitorStats";
import styles from "./FooterPresence.module.css";

export function FooterPresence() {
  const t = useTranslations("stats");
  const common = useTranslations("common");
  const { open, toggle, setOpen, ref } = useDisclosure("footer-presence");
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className={styles.presence} ref={ref}>
      <button
        className={styles.trigger}
        type="button"
        onClick={toggle}
        aria-label={t("open")}
        aria-expanded={open}
        aria-controls={id}
        title={t("demo")}
      >
        <span className={styles.live} aria-hidden="true" />
        <Users size={12} aria-hidden="true" />
        <span>{t("readers", { count: 8 })}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            className={styles.panel}
            role="region"
            aria-label={t("open")}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 5 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
          >
            <div className={styles.top}>
              <span>{t("presenceTitle")}</span>
              <button
                type="button"
                aria-label={common("close")}
                onClick={() => setOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
            <VisitorStatsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
