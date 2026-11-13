import type { ReactNode } from "react";
import styles from "./CoastalMarks.module.css";

type Motif = "shell" | "tide" | "wind" | "leaf";
export type SeasonalMarkKind = "leaf" | "ginkgo" | "petal" | "snow";

/** Small filled paper forms, deliberately different from line-art ornaments. */
export function SeasonalMark({
  kind,
  className = "",
}: {
  kind: SeasonalMarkKind;
  className?: string;
}) {
  return (
    <svg
      className={`${styles.seasonal} ${className}`}
      viewBox="0 0 32 40"
      fill="none"
      aria-hidden="true"
    >
      {kind === "snow" ? (
        <path
          d="M16 5v30M3 12l26 16M3 28l26-16M12 8l4 4 4-4m-8 24 4-4 4 4M5 17l5-1-1-5m14 18-1-5 5-1M4 23l6 1-1 5m14-18-1 5 5 1"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : kind === "ginkgo" ? (
        <>
          <path
            d="M16 30C12 24 7 23 3 24L1 17C1 10 6 4 11 2c3 2 4 5 5 9 1-5 2-8 5-9 6 3 10 8 10 15l-3 8c-5-2-8 0-12 5Z"
            fill="currentColor"
          />
          <path d="m16 29 1 9" stroke="currentColor" strokeWidth="1" />
          <path
            className={styles.vein}
            d="M16 29C10 20 7 15 6 10m10 19C13 18 12 12 12 7m4 22V14m0 15c4-12 6-17 10-20m-10 20c6-7 9-10 12-12"
          />
        </>
      ) : kind === "petal" ? (
        <>
          <path
            d="M16 34C8 29 0 17 4 9c3-6 9-6 12-1 4-6 10-5 13 1 4 9-6 21-13 25Z"
            fill="currentColor"
          />
          <path className={styles.vein} d="M16 32c-2-8-2-15 0-22" />
        </>
      ) : (
        <>
          <path
            d="M5 29C-1 17 10 5 28 2c1 17-8 29-23 27Z"
            fill="currentColor"
          />
          <path
            d="M2 37C6 24 14 13 25 5"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            className={styles.vein}
            d="M5 28 25 5M10 23 9 15m6 4 9-1m-5-4-1-6"
          />
        </>
      )}
    </svg>
  );
}
const glyphs: Record<Motif, ReactNode> = {
  shell: (
    <>
      <path d="M5 15C0 4 10 0 13 5c5-4 12 4 6 11l-5 4-4-1-5-4Z" />
      <path d="m11 17-5-8m7 9-1-12m3 11 3-8M8 20q5-2 8 0" />
    </>
  ),
  tide: (
    <>
      <path d="M2 9q4-5 9-1t11-1M1 15q5-4 11-1t10-2M6 20l8-1m3-14 3-3" />
    </>
  ),
  wind: (
    <>
      <path d="m12 2 2 7 7 2-7 3-2 8-3-7-7-3 7-2 3-8Zm-7 3-2-2m17 17 2 2M18 5l3-2" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 18C1 8 11 2 20 4c-1 9-6 16-15 14ZM3 22 16 7m-9 8 7 1m-3-5-1-5" />
    </>
  ),
};
export function CoastGlyph({
  kind = "shell",
  className = "",
}: {
  kind?: Motif;
  className?: string;
}) {
  return (
    <svg
      className={`${styles.glyph} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {glyphs[kind]}
    </svg>
  );
}

const lines = {
  shore:
    "M3 8C60 4 95 10 155 7S254 9 315 6 420 9 478 7 582 9 638 6 745 10 837 7M38 11l75-2m184 1 57-2m263 3 79-3",
  trail:
    "M3 7C85 10 116 4 185 7S282 5 354 8 469 4 538 7 659 5 723 8 785 5 837 7M25 10l61-2m126 2 46-2m199 2 83-1m182 0 72-2",
  fold: "M3 6C92 9 133 3 214 6S340 4 424 7 553 4 628 6 742 9 837 5M29 9l76-2m190 2 53-2m295 2 97-3",
};
/** An uneven coastline, with a lighter second pass. Never receives pointer events. */
export function PencilLine({
  kind = "shore",
  className = "",
}: {
  kind?: keyof typeof lines;
  className?: string;
}) {
  return (
    <svg
      className={`${styles.line} ${className}`}
      viewBox="0 0 840 16"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path d={lines[kind]} />
      <path className={styles.echo} d="M4 10q105-4 208-2t212-1 208 2 205-2" />
    </svg>
  );
}
const outlines = {
  paper:
    "M5 5 127 3l107 2 105-2 55 4-2 74 3 72-2 80-97 3-117-2-104 3-72-5 2-79-2-76Z",
  note: "M8 4 116 6l117-3 100 3 60-1-2 85 3 65-1 78-99 3-111-2-108 3-70-3 3-80-2-74Z",
  ticket:
    "M6 6q91-4 180-1l108-1 100 4-2 75-3 6 4 5-1 70 3 69-97 3-112-2-103 3-79-4 2-73 3-8-4-7 1-71Z",
};
/** A code-native paper edge, shared by postcards, project studies and photograph mounts. */
export function PencilFrame({
  kind = "paper",
  className = "",
}: {
  kind?: keyof typeof outlines;
  className?: string;
}) {
  return (
    <svg
      className={`${styles.frame} ${className}`}
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path className={styles.paper} d={outlines[kind]} />
      <path className={styles.edge} d={outlines[kind]} />
      <path className={styles.corner} d="m9 25 1-15 23-1M369 231l19-1 1-16" />
    </svg>
  );
}
export function SketchLabel({
  children,
  kind = "shell",
  className = "",
}: {
  children: ReactNode;
  kind?: Motif;
  className?: string;
}) {
  return (
    <span className={`${styles.label} ${className}`}>
      <CoastGlyph kind={kind} />
      <span>{children}</span>
    </span>
  );
}
