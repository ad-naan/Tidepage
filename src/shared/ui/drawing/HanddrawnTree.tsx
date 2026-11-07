"use client";
import { motion, useReducedMotion } from "motion/react";
import { softSpring } from "@/shared/lib/motion";

/** A pencil rail with branches; labels and navigation remain with its consumer. */
export function HanddrawnTree({
  count,
  active,
  expanded,
  percent,
  rowHeight,
  className,
}: {
  count: number;
  active: number;
  expanded: boolean;
  percent: number;
  rowHeight: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const height = count * rowHeight;
  const point = active * rowHeight + 18;
  const d = `M15 4 C14 ${Math.max(4, point - 40)} 12 ${Math.max(4, point - 20)} 17 ${Math.max(4, point - 9)} C24 ${point - 2} 24 ${point + 3} 17 ${point + 12} C12 ${Math.min(height - 6, point + 27)} 16 ${height - 24} 14 ${height - 5}`;
  return (
    <svg
      className={className}
      viewBox={`0 0 56 ${height}`}
      fill="none"
      aria-hidden="true"
      style={{ height }}
    >
      <motion.path
        initial={false}
        d={d}
        animate={{ d }}
        transition={reduced ? { duration: 0 } : softSpring}
        stroke="var(--line)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <motion.path
        initial={false}
        d={d}
        animate={{ d, pathLength: percent / 100 }}
        transition={reduced ? { duration: 0 } : softSpring}
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {Array.from({ length: count }, (_, index) => {
        const y = index * rowHeight + 18;
        const open = expanded || index === active;
        const end = open ? 35 : 22;
        return (
          <g
            key={index}
            stroke={index === active ? "var(--accent)" : "var(--muted)"}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.path
              initial={false}
              animate={{
                d: `M16 ${y} Q${open ? 24 : 18} ${y - 1} ${end} ${y - (open ? 6 : 2)}`,
                opacity: index === active ? 0.95 : 0.4,
              }}
              transition={reduced ? { duration: 0 } : softSpring}
              strokeWidth="1.2"
            />
            <motion.path
              initial={false}
              d={`M22 ${y - 1}q-2-8 5-8q1 5-5 8`}
              animate={{ opacity: index === active ? 0.65 : 0 }}
              transition={{ duration: reduced ? 0 : 0.25 }}
              strokeWidth="0.8"
            />
            <circle
              cx="15.5"
              cy={y}
              r={index === active ? 2.2 : 1.4}
              fill={index === active ? "var(--accent)" : "var(--paper)"}
              strokeWidth="0.8"
            />
          </g>
        );
      })}
    </svg>
  );
}
