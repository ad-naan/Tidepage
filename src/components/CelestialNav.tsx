"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { softSpring, spring } from "@/shared/lib/motion";
import { SkyPlayground } from "./SkyPlayground";

const destinations = [
  { href: "/", label: "首页" },
  { href: "/articles", label: "文章" },
  { href: "/notes", label: "手记" },
  { href: "/projects", label: "项目" },
  { href: "/quotes", label: "一言" },
  { href: "/gallery", label: "照片廊" },
  { href: "/about", label: "自述" },
];
const angles = [-73, -48, -24, 0, 24, 48, 73];
const rounded = (value: number) => Number(value.toFixed(3));
const points = angles.map((angle) => {
  const radians = (angle * Math.PI) / 180;
  return {
    x: rounded(57 + Math.cos(radians) * 103),
    y: rounded(245 + Math.sin(radians) * 170),
    angle,
  };
});
const beam = (i: number) => {
  const { x, y } = points[i];
  return `M${rounded(57 + (x - 57) * 0.22)} ${rounded(245 + (y - 245) * 0.13)} Q${rounded(88 + (x - 88) * 0.2)} ${rounded(245 + (y - 245) * 0.55)} ${x} ${y}`;
};

export function CelestialNav({
  theme,
  mobileOpen,
  onNavigate,
  immersive = false,
}: {
  theme: "light" | "dark";
  mobileOpen: boolean;
  onNavigate: () => void;
  immersive?: boolean;
}) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [revealed, setRevealed] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const dragging = useRef(false);
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 25 });
  const folded = compact || immersive;
  const expanded = mobileOpen || (revealed ?? !folded);
  const active = Math.max(
    0,
    destinations.findIndex((d) =>
      d.href === "/" ? pathname === "/" : pathname.startsWith(d.href),
    ),
  );
  useMotionValueEvent(scrollY, "change", (v) => {
    if (v > 90) {
      setCompact(true);
    } else if (v < 40) {
      setCompact(false);
    }
  });
  useEffect(() => {
    setRevealed(null);
  }, [pathname, compact, immersive]);
  return (
    <aside
      className={`celestial-sidebar ${mobileOpen ? "is-open" : ""} ${expanded ? "sky-expanded" : "sky-folded"} ${theme === "dark" ? "sky-night" : "sky-day"}`}
      aria-label="光轨导航"
    >
      <button
        className="sky-mobile-close"
        aria-label="收起光轨导航"
        onClick={onNavigate}
      >
        <X size={20} />
      </button>
      <div className="sky-navigation">
        <motion.div
          className="sky-halo"
          animate={{ opacity: expanded ? 1 : 0.25, scale: expanded ? 1 : 0.55 }}
          transition={softSpring}
        />
        <svg
          className="sky-tracks"
          viewBox="0 0 225 490"
          fill="none"
          aria-hidden="true"
        >
          <AnimatePresence>
            {expanded && (
              <motion.g
                key="rays"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
              >
                {points.map((p, i) => (
                  <g key={i}>
                    <motion.path
                      d={beam(i)}
                      stroke="currentColor"
                      strokeWidth={active === i || hovered === i ? 1.15 : 0.65}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: 1,
                        opacity: active === i || hovered === i ? 0.75 : 0.17,
                      }}
                      exit={{ pathLength: 0, opacity: 0 }}
                      transition={{
                        ...softSpring,
                        delay: reduce ? 0 : i * 0.024,
                      }}
                    />
                    <motion.circle
                      cx={p.x}
                      cy={p.y}
                      r={active === i ? 3 : 1.6}
                      fill="currentColor"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: 1,
                        opacity: active === i || hovered === i ? 1 : 0.35,
                      }}
                      transition={{
                        ...spring,
                        delay: reduce ? 0 : 0.07 + i * 0.025,
                      }}
                    />
                  </g>
                ))}
                <motion.path
                  d="M87 80Q238 245 87 410"
                  stroke="currentColor"
                  strokeWidth=".6"
                  strokeDasharray="1 7"
                  opacity=".16"
                />
              </motion.g>
            )}
          </AnimatePresence>
          <motion.circle
            cx="57"
            cy="245"
            r="29"
            stroke="currentColor"
            strokeWidth="1"
            opacity={folded ? 0.6 : 0}
            style={{ pathLength: reduce ? scrollYProgress : progress }}
            transform="rotate(-90 57 245)"
          />
          {theme === "dark" && (
            <g className="sky-stars" fill="currentColor">
              <circle cx="31" cy="115" r="1.2" />
              <circle cx="160" cy="70" r=".9" />
              <circle cx="190" cy="432" r="1.1" />
              <path d="m26 366 2-4 2 4-2 4Z" />
              <path d="m191 179 2-4 2 4-2 4Z" />
            </g>
          )}
        </svg>
        <motion.button
          className="sky-orb"
          drag={!reduce}
          dragSnapToOrigin
          dragConstraints={{ left: -13, right: 13, top: -13, bottom: 13 }}
          dragElastic={0.2}
          onDragStart={() => {
            dragging.current = true;
          }}
          onDragEnd={() => {
            setTimeout(() => {
              dragging.current = false;
            }, 180);
          }}
          onClick={() => {
            if (!dragging.current) setRevealed(!expanded);
          }}
          title="拉动日月，让光线轻轻回弹"
          aria-label={expanded ? "收起光轨导航" : "展开光轨导航"}
          aria-expanded={expanded}
          aria-controls="sky-destinations"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={spring}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              className="sky-orb-art"
              initial={{ opacity: 0, rotate: -35, scale: 0.7 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 35, scale: 0.7 }}
              transition={softSpring}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 54 54" fill="none" aria-hidden="true">
                  <g
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeWidth="1"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <path
                        key={i}
                        d="M27 3V8"
                        transform={`rotate(${i * 30} 27 27)`}
                      />
                    ))}
                  </g>
                  <circle
                    cx="27"
                    cy="27"
                    r="13"
                    fill="currentColor"
                    fillOpacity=".16"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <circle
                    cx="27"
                    cy="27"
                    r="9"
                    fill="currentColor"
                    fillOpacity=".18"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 54 54" fill="none" aria-hidden="true">
                  <path
                    d="M34 10c-15 3-18 24-1 29C17 48 2 31 12 17c5-7 13-10 22-7Z"
                    fill="currentColor"
                    fillOpacity=".18"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path
                    d="m41 14 1-4 1 4 4 1-4 1-1 4-1-4-4-1Z"
                    stroke="currentColor"
                    strokeWidth=".8"
                  />
                  <circle cx="40" cy="31" r="1" fill="currentColor" />
                </svg>
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <AnimatePresence initial={false}>
          {expanded ? (
            <nav
              id="sky-destinations"
              className="sky-destinations"
              aria-label="主导航"
              key="expanded"
            >
              {destinations.map((d, i) => (
                <motion.div
                  key={d.href}
                  style={{
                    left: `${rounded(points[i].x + 11)}px`,
                    top: `${rounded(points[i].y - 14)}px`,
                  }}
                  initial={{
                    opacity: 0,
                    x: -10,
                    filter: reduce ? "none" : "blur(3px)",
                  }}
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{
                    opacity: 0,
                    x: -8,
                    filter: reduce ? "none" : "blur(2px)",
                  }}
                  transition={{ ...spring, delay: reduce ? 0 : i * 0.026 }}
                >
                  <Link
                    href={d.href}
                    className={active === i ? "sky-link active" : "sky-link"}
                    aria-current={active === i ? "page" : undefined}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onClick={onNavigate}
                  >
                    {d.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
          ) : (
            <motion.button
              key="location"
              className="sky-current"
              onClick={() => setRevealed(true)}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={spring}
            >
              <span>{destinations[active].label}</span>
              <ChevronRight size={12} />
            </motion.button>
          )}
        </AnimatePresence>
        <SkyPlayground expanded={expanded} onPlay={() => setRevealed(false)} />
      </div>
    </aside>
  );
}
