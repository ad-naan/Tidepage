"use client";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/shared/i18n/navigation";
import { softSpring } from "@/shared/lib/motion";
import { AboutLetter } from "@/components/AboutLetter";
import { OtterDrawing } from "@/components/OtterDrawing";
import styles from "./illustration.module.css";

export function HeroSketch({
  quiet = false,
  onWish,
}: {
  quiet?: boolean;
  onWish?: () => void;
}) {
  const t = useTranslations("sketch");
  const uid = useId().replaceAll(":", "");
  const [greeting, setGreeting] = useState(false);
  const [wish, setWish] = useState(0);
  const [boarding, setBoarding] = useState(false);
  const [ripples, setRipples] = useState<
    { id: number; x: number; y: number }[]
  >([]);
  const serial = useRef(0);
  const departure = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const router = useRouter();
  const reduce = useReducedMotion();
  function makeWish() {
    setWish((value) => value + 1);
    onWish?.();
  }
  useEffect(() => () => clearTimeout(departure.current), []);
  function water(event: PointerEvent<SVGSVGElement>) {
    if (reduce) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 700,
      y = ((event.clientY - bounds.top) / bounds.height) * 390;
    if (x < 310 || x > 670 || y < 174 || y > 242) return;
    const id = ++serial.current;
    setRipples((current) => [...current.slice(-3), { id, x, y }]);
  }
  return (
    <div className={`hero-art ${styles.scene}`}>
      <svg
        viewBox="0 0 700 390"
        aria-label={t("coast")}
        role="img"
        fill="none"
        onPointerDown={water}
      >
        <defs>
          <pattern
            id={`hatch${uid}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(28)"
          >
            <path
              d="M0 0V5"
              stroke="currentColor"
              strokeWidth=".5"
              opacity=".22"
            />
          </pattern>
          <linearGradient id={`sun${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="var(--sun-top)" />
            <stop offset="1" stopColor="var(--sun-bottom)" stopOpacity=".3" />
          </linearGradient>
          <linearGradient id={`rock${uid}`} x2="0" y2="1">
            <stop stopColor="var(--rock-light)" />
            <stop offset="1" stopColor="var(--paper)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g
            className={styles.night}
            stroke="none"
            fill="var(--coast-reflection)"
          >
            {[
              [330, 38],
              [417, 64],
              [537, 30],
              [641, 47],
              [315, 85],
              [558, 112],
              [380, 27],
              [662, 127],
            ].map(([x, y], index) => (
              <circle
                className={styles.star}
                key={index}
                cx={x}
                cy={y}
                r={index % 3 === 0 ? 1.1 : 0.7}
              />
            ))}
            {wish > 0 && !reduce && (
              <motion.path
                key={wish}
                d="M390 35l-58 30"
                stroke="var(--coast-reflection)"
                strokeWidth="1.2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: [0, 1, 1],
                  opacity: [0, 1, 0],
                  x: [0, -55, -90],
                  y: [0, 28, 45],
                }}
                transition={{ duration: 1.8 }}
              />
            )}
          </g>
          <g opacity=".72">
            <path d="M180 118q12-12 25-8 2-14 20-14 8-26 34-18 13 1 16 18 21-3 29 13M235 69q12-5 21 0M282 108q8-2 10 7M556 98q8-15 21-9 4-25 27-18 6-20 27-13 20-1 25 18 19-6 29 10M580 85q7-3 11 2" />
            <path
              d="M155 130h78m29 0h82m-156 7h94m30-14h48m207-20h71m47-10h34"
              stroke="var(--accent)"
              opacity=".55"
            />
          </g>
          <motion.g
            drag={!reduce}
            dragConstraints={{ left: -25, right: 25, top: -30, bottom: 15 }}
            dragSnapToOrigin
            dragElastic={0.2}
            style={{ cursor: "grab" }}
            whileTap={{ cursor: "grabbing" }}
            onTap={makeWish}
          >
            <g className={styles.day}>
              <circle
                cx="485"
                cy="133"
                r="34"
                fill={`url(#sun${uid})`}
                stroke="var(--accent)"
                strokeWidth=".8"
              />
              <circle
                cx="485"
                cy="133"
                r="32"
                fill={`url(#hatch${uid})`}
                stroke="none"
              />
            </g>
            <g className={styles.night}>
              <circle
                cx="485"
                cy="133"
                r="41"
                fill="var(--coast-reflection)"
                opacity=".045"
                stroke="none"
              />
              <circle
                cx="485"
                cy="133"
                r="34"
                fill="var(--moon-fill)"
                stroke="#d2deef"
                strokeWidth=".6"
              />
              <path
                d="M463 114q-11 17-4 33 7 15 24 18-21 1-30-18-7-20 10-33"
                fill="#b8c9dd"
                opacity=".28"
                stroke="none"
              />
              <g fill="#a4b8cd" stroke="none" opacity=".28">
                <circle cx="497" cy="119" r="5" />
                <circle cx="506" cy="136" r="3.5" />
                <circle cx="481" cy="148" r="6" />
                <circle cx="470" cy="127" r="2.6" />
              </g>
            </g>
          </motion.g>
          <path
            d="M107 169q129-4 225 1t345-2M148 175h118m40 1h89m122-1h146"
            opacity=".45"
          />
          <path d="M179 166 202 154 219 153 237 144 246 151 255 150 273 166M204 164 236 147 229 159 241 155 250 162M216 162 227 154" />
          <path d="M177 171h107M197 177h75" opacity=".5" />
          {Array.from({ length: 24 }, (_, i) => (
            <path
              key={i}
              d={`M${130 + ((i * 83) % 510)} ${183 + Math.floor(i / 3) * 11}h${15 + ((i * 13) % 63)}`}
              opacity={i % 3 === 0 ? 0.34 : 0.16}
            />
          ))}
          <g stroke="var(--coast-reflection)" opacity=".65">
            <path d="M451 176h69m-58 7h35m-48 8h77m-62 8h39m-48 9h65m-47 8h31m-42 9h62m-52 8h27m-9 9h42m-50 9h26" />
          </g>
          {ripples.map((ripple) => (
            <motion.ellipse
              key={ripple.id}
              cx={ripple.x}
              cy={ripple.y}
              stroke="var(--coast-reflection)"
              strokeWidth=".9"
              initial={{ rx: 3, ry: 1, opacity: 0.7 }}
              animate={{ rx: 42, ry: 9, opacity: 0 }}
              transition={{ duration: 1.6 }}
              onAnimationComplete={() =>
                setRipples((current) =>
                  current.filter((item) => item.id !== ripple.id),
                )
              }
            />
          ))}
          <path
            d="M536 224 560 212 571 218 600 188 614 200 627 197 652 218 674 225"
            fill={`url(#rock${uid})`}
          />
          <path d="m556 222 15-4 29-30-6 22 10-7 8 12 2-15m13-3-5 16 17 8m-48-9-12 11m29-12 7 10m-69 10h116m-89 6h62" />
          <path d="m611 202 15 13m-29-2-5 11m41-7 8 8" opacity=".5" />
          <path
            d="M135 243Q163 224 197 243L227 248Q251 225 275 236L316 257Q340 245 373 265L422 276Q446 265 464 284L497 306Q530 286 554 311L605 326 649 354"
            fill="var(--coast-shore)"
          />
          <path
            d="M149 256 177 244 199 250 211 276 239 285 257 263 278 260 309 279 321 307 347 320 374 290 406 294 424 313 453 322 468 348 511 338 551 356"
            fill={`url(#rock${uid})`}
            strokeWidth="1.6"
          />
          <path d="m164 256 22-6 16 22-14-5m34 12-9 17 25 6m30-33-8 18 28-8 14 18m22 14-15 3 10 13m58-26 18-4-7 18 21 5m29-3 13 16 17 4m-3 16 14 9m51-13 20-3 19 13" />
          <path
            d="M154 261 182 257 191 271 213 283 220 302 233 307 224 313 201 289 185 281ZM260 279 278 268 301 285 311 310 333 321 315 330 299 304 280 299ZM381 303 394 298 391 318 421 325 438 344 418 337 393 330Z"
            fill={`url(#hatch${uid})`}
            stroke="none"
          />
          {Array.from({ length: 21 }, (_, i) => {
            const x = 143 + i * 23;
            const y = 257 + i * 4.6 + (i % 3) * 13;
            return (
              <g key={i}>
                <path
                  d={`M${x} ${y}q-2-14-7-17m7 17q5-12 10-14m-10 14 1-18`}
                  strokeWidth=".8"
                />
                <path d={`M${x - 5} ${y + 3}h2m6 2h4`} opacity=".6" />
                {i % 3 === 0 && (
                  <ellipse
                    cx={x + 10}
                    cy={y - 15}
                    rx="2"
                    ry="4"
                    transform={`rotate(30 ${x + 10} ${y - 15})`}
                    fill="var(--accent)"
                    strokeWidth=".6"
                  />
                )}
              </g>
            );
          })}
          {quiet ? (
            <g transform="translate(205 166) scale(.96)">
              <motion.g
                animate={reduce ? {} : { y: greeting ? -2 : 0 }}
                transition={softSpring}
              >
                <OtterDrawing />
              </motion.g>
            </g>
          ) : (
            <image
              href="/images/otter-v2.png"
              x="150"
              y="123"
              width="155"
              height="143"
              preserveAspectRatio="xMidYMid meet"
            />
          )}
          <motion.g
            animate={
              reduce
                ? {}
                : { y: [0, -3, 0], x: wish % 2 === 0 ? [0, 2, 0] : [0, 6, 0] }
            }
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M98 61q15-3 23 7 5-16 22-20M117 68l5 1M362 57q9-2 16 5 4-9 14-12M597 31q9-3 17 5 3-9 13-11"
              strokeWidth="1.6"
            />
          </motion.g>
          <path
            d="M21 243C77 246 63 189 114 190S156 228 175 227"
            stroke="var(--accent)"
            strokeWidth=".75"
            opacity=".7"
          />
          <g className={styles.night} stroke="none" fill="#ead7a2">
            {[
              [173, 249],
              [322, 281],
              [436, 304],
              [563, 331],
              [507, 320],
            ].map(([x, y], index) => (
              <circle
                key={index}
                className={styles.firefly}
                cx={x}
                cy={y}
                r="1.5"
              />
            ))}
          </g>
        </g>
        <text
          x="40"
          y="292"
          className="svg-hand"
          transform="rotate(-12 40 292)"
        >
          {t("page")}
        </text>
        <text
          x="59"
          y="315"
          className="svg-hand"
          transform="rotate(-12 59 315)"
        >
          {t("slow")}
        </text>
        <path d="m90 328 28-8" stroke="var(--accent)" />
      </svg>
      <button
        className={styles.skyHit}
        aria-label={t("skyPlay")}
        onClick={makeWish}
      />
      <Link
        href="/explore"
        className={styles.boatLink}
        aria-label={t("board")}
        aria-disabled={boarding}
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          if (boarding) return;
          if (reduce) {
            router.push("/explore");
            return;
          }
          setBoarding(true);
          departure.current = setTimeout(() => router.push("/explore"), 800);
        }}
      >
        <span className={styles.boatHint}>{t("boardHint")}</span>
        <motion.svg
          viewBox="0 0 62 50"
          fill="none"
          aria-hidden="true"
          animate={
            boarding
              ? { x: 100, y: -32, scale: 0.5, opacity: 0 }
              : reduce
                ? {}
                : { y: [0, -2, 0], rotate: [-2, 2, -2] }
          }
          transition={
            boarding
              ? { duration: 0.8, ease: "easeIn" }
              : { duration: 4, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <path
            d="m5 30 20 3 31-3-13 13H18Z"
            fill="var(--coast-shore)"
            stroke="currentColor"
            strokeWidth="1.1"
          />
          <path
            d="M28 32V7l-17 21h17m4-19v22h17Z"
            fill="var(--letter-paper)"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path d="m28 7 10 3-10 4" fill="var(--accent)" stroke="none" />
          <path
            d="M4 46h18m6 0h25M13 49h29"
            stroke="var(--coast-reflection)"
            opacity=".5"
            strokeWidth=".8"
          />
        </motion.svg>
      </Link>
      <span className={styles.whisper} role="status">
        {boarding ? t("departing") : ""}
      </span>
      <AboutLetter />
      <button
        className="otter-hit"
        aria-label={t("greet")}
        onClick={() => setGreeting((v) => !v)}
      />
      <AnimatePresence>
        {greeting && (
          <motion.div
            className="otter-bubble"
            initial={{ opacity: 0, scale: 0.5, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={softSpring}
          >
            {t("greeting")}
            <span>{t("next")}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
