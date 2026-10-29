"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/i18n/navigation";
import { motion } from "motion/react";
import { House, Tree } from "./Sketch";
import { softSpring } from "@/shared/lib/motion";
const stops = [{number:"01",key:"technology"},{number:"02",key:"product"},{number:"03",key:"life"}] as const;
export function Journey() {
  const t=useTranslations("journey"),categories=useTranslations("categories");
  return (
    <div className="journey journey-clean">
      <div className="section-kicker">
        <span />
        {t("title")}
      </div>
      <div className="journey-map">
        <svg viewBox="0 0 150 350" fill="none" aria-hidden="true">
          <g stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path
              d="M62 51C139 84 23 129 64 168S146 235 83 294"
              stroke="var(--accent)"
              strokeWidth="1.1"
            />
            <House x={29} y={12} scale={0.75} />
            <path d="M19 47l55 10" opacity=".3" />
            <Tree x={52} y={142} scale={0.64} />
            <Tree x={70} y={158} scale={0.4} />
            <path d="M40 173l45 7" opacity=".3" />
            <path
              d="M69 302 72 263 82 263 86 305M69 263H85l-3-6H72ZM72 257l5-10 5 10M77 247v-5M74 271h6m-6 8h7m-8 12h10M64 305l31 3"
              fill="var(--paper)"
            />
            <circle
              cx="80"
              cy="68"
              r="3"
              fill="var(--accent)"
              stroke="var(--paper)"
            />
            <circle
              cx="76"
              cy="181"
              r="3"
              fill="var(--accent)"
              stroke="var(--paper)"
            />
            <circle
              cx="89"
              cy="287"
              r="3"
              fill="var(--accent)"
              stroke="var(--paper)"
            />
          </g>
        </svg>
        <div className="journey-labels">
          {stops.map((stop) => (
            <motion.div
              key={stop.number}
              whileHover={{ x: 6 }}
              transition={softSpring}
            >
              <Link
                href={`/articles?category=${stop.key}`}
              >
                <span>{stop.number}</span>
                <div>
                  <h3>{categories(stop.key)}</h3>
                  <p>{t(stop.key)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
      <p className="journey-closing">{t("end")}</p>
    </div>
  );
}
