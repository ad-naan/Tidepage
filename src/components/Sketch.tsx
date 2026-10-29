"use client";
import { useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { softSpring } from "@/shared/lib/motion";
import { AboutLetter } from "./AboutLetter";
import { OtterDrawing } from "./OtterDrawing";

export function Tree({
  x = 0,
  y = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="var(--paper)"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    >
      <path d="M0 0 -7 12 -3 11 -11 23 -5 21 -15 34 -3 31 -3 43 2 44 2 31 13 34 5 21 10 23 3 11 7 13Z" />
      <path d="M-1 9 0 35M-1 19 -6 24M0 28 5 31M2 16 5 19" fill="none" />
    </g>
  );
}
export function House({
  x = 0,
  y = 0,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    >
      <path d="M0 15 22 0 49 7 57 23 32 21 22 7 8 22Z" fill="#c7beb0" />
      <path d="M8 21 22 7 32 21 32 43 8 38Z" fill="var(--paper)" />
      <path d="M32 21 57 23 57 39 32 43Z" fill="#e5c39a" />
      <path
        d="M15 39 15 27 22 28 22 40M37 28 43 28 43 34 37 34ZM49 29 53 29 53 34 49 34M42 7 42 0 47 1 47 10M2 17 20 4M28 10 44 13M31 15 50 19"
        fill="none"
      />
      <path d="M10 42 3 45M49 43 62 43M16 46 37 46" opacity=".5" />
    </g>
  );
}
export function MiniSketch({
  kind,
  className = "",
}: {
  kind: "sun" | "mountain" | "boat" | "tree";
  className?: string;
}) {
  return (
    <svg
      className={`mini-sketch ${className}`}
      viewBox="0 0 180 90"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {kind === "sun" && (
          <>
            <path
              d="M64 52a24 24 0 0 1 48 0"
              fill="var(--wash)"
              stroke="var(--accent)"
            />
            <path
              d="M70 49a17 17 0 0 1 32-7M89 14V7M62 23 56 16M47 40 36 36M113 24 121 16M126 40 139 35"
              stroke="var(--accent)"
            />
            <path d="M17 55 41 53 51 47 59 52 73 53M103 54 121 51 129 45 138 51 159 53M29 59H73M105 59H147M61 66H114M83 73H126M42 76H68" />
            <path
              d="M84 58 102 58M78 63 95 63M90 69 108 69M85 79 99 79"
              stroke="var(--accent)"
            />
          </>
        )}
        {kind === "mountain" && (
          <>
            <path d="M13 69 45 49 58 52 85 18 97 32 108 29 141 58 163 65" />
            <path d="M50 56 85 18 77 42 86 37 95 49 98 39 108 29M85 18 90 37M97 32 114 53 129 59M37 61 57 53 52 64M17 75 64 72M100 72 158 76M71 78 122 80" />
            <path
              d="m88 39 4 17m6-9 4 12m7-11 6 15m-43-9-7 12m10-17-4 11m-15 1-6 8m78-9 7 6"
              opacity=".5"
            />
            <path d="M105 37 119 51 124 52" stroke="var(--accent)" />
          </>
        )}
        {kind === "boat" && (
          <>
            <path
              d="M90 17 89 66M88 23 61 61 87 61ZM94 31 110 60 94 60M57 65 118 65 107 74 67 73Z"
              fill="var(--paper)"
            />
            <path d="M84 34 83 56 68 57M98 43 105 57M59 68 110 69M21 73 54 72M123 72 158 71M39 79 84 79M103 81 145 79M74 85 113 85" />
            <path
              d="M95 20 104 22 95 25"
              fill="var(--accent)"
              stroke="var(--accent)"
            />
          </>
        )}
        {kind === "tree" && (
          <>
            <path d="M87 71 86 48 79 39M86 57 98 44M85 66 77 53M84 71 95 74" />
            <path d="M75 54C62 55 57 46 63 38 53 30 64 22 72 23 69 8 86 7 91 17 103 13 114 25 108 34 122 42 109 55 99 54 94 62 82 61 75 54Z" />
            <path d="M37 74 68 70 81 72M103 73 126 72 150 77M49 80 75 80M97 82 119 83M91 22 94 28M65 42 71 45" />
            <path
              d="M123 66Q153 66 142 79Q132 88 157 86"
              stroke="var(--accent)"
            />
          </>
        )}
      </g>
    </svg>
  );
}

export function HeroSketch({ quiet = false }: { quiet?: boolean }) {
  const uid = useId().replaceAll(":", "");
  const [greeting, setGreeting] = useState(false);
  const reduce = useReducedMotion();
  return (
    <div className="hero-art">
      <svg
        viewBox="0 0 700 390"
        aria-label="手绘海岸：水獭坐在礁石上，看着落日与远山"
        role="img"
        fill="none"
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
          <linearGradient id={`sun${uid}`} x2="0" y2="1">
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
          >
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
          <g stroke="var(--accent)" opacity=".65">
            <path d="M451 176h69m-58 7h35m-48 8h77m-62 8h39m-48 9h65m-47 8h31m-42 9h62m-52 8h27m-9 9h42m-50 9h26" />
          </g>
          <path
            d="M536 224 560 212 571 218 600 188 614 200 627 197 652 218 674 225"
            fill={`url(#rock${uid})`}
          />
          <path d="m556 222 15-4 29-30-6 22 10-7 8 12 2-15m13-3-5 16 17 8m-48-9-12 11m29-12 7 10m-69 10h116m-89 6h62" />
          <path d="m611 202 15 13m-29-2-5 11m41-7 8 8" opacity=".5" />
          <path
            d="M135 243Q163 224 197 243L227 248Q251 225 275 236L316 257Q340 245 373 265L422 276Q446 265 464 284L497 306Q530 286 554 311L605 326 649 354"
            fill="var(--paper)"
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
              <OtterDrawing />
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
            animate={reduce ? {} : { y: [0, -3, 0] }}
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
        </g>
        <text
          x="40"
          y="292"
          className="svg-hand"
          transform="rotate(-12 40 292)"
        >
          这一页，
        </text>
        <text
          x="59"
          y="315"
          className="svg-hand"
          transform="rotate(-12 59 315)"
        >
          慢慢写。
        </text>
        <path d="m90 328 28-8" stroke="var(--accent)" />
      </svg>
      <AboutLetter />
      <button
        className="otter-hit"
        aria-label="和小水獭打个招呼"
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
            这一页，陪你看日落。<span>下一页，一起继续走 ♡</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
