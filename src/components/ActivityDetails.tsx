"use client";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Code2, Coffee, Headphones, Terminal } from "lucide-react";
import { spring } from "@/shared/lib/motion";
export function ActivityDetails() {
  const t = useTranslations("activity");
  const reduce = useReducedMotion();
  return (
    <div className="activity-details">
      <div className="activity-now">
        <div className="current-activity">
          <span className="app-icon">
            <Code2 size={25} />
          </span>
          <div>
            <strong>Visual Studio Code</strong>
            <p>{t("current")}</p>
          </div>
        </div>
        <div className="focus-duration">
          <span>
            {t("focus")}
            <strong>{t("focusDuration")}</strong>
          </span>
          <span className="focus-dots">
            {Array.from({ length: 8 }, (_, i) => (
              <motion.i
                key={i}
                initial={{ scaleY: 0.2, opacity: 0 }}
                animate={{ scaleY: 1, opacity: i > 5 ? 0.25 : 1 }}
                transition={{ ...spring, delay: reduce ? 0 : 0.06 + i * 0.035 }}
              />
            ))}
          </span>
        </div>
        <p className="activity-now-caption">
          <span className="live-dot" />
          {t("caption")}
        </p>
      </div>
      <div className="activity-history">
        {[
          { icon: Terminal, title: t("debug"), time: "14:20" },
          { icon: Headphones, title: t("listen"), time: "13:45" },
          { icon: Coffee, title: t("coffee"), time: "13:10" },
        ].map((item, i) => (
          <motion.div
            key={item.time}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: reduce ? 0 : 0.08 + i * 0.045 }}
          >
            <item.icon size={14} />
            <span>{item.title}</span>
            <time>{item.time}</time>
          </motion.div>
        ))}
      </div>
      <div className="presence-note">
        {t("note")}
        <span>{t("noteSub")}</span>
      </div>
    </div>
  );
}
