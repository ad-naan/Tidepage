import styles from "./StationeryDrawing.module.css";

/** Stationery drawn in fixed, repeatable pencil strokes. Text stays outside the SVG. */
export function StationeryDrawing({
  kind,
  className = "",
}: {
  kind: "notebook" | "bookmark" | "pencil" | "arrow";
  className?: string;
}) {
  const viewBox = kind === "notebook" ? "0 0 180 220" : "0 0 64 64";
  return (
    <svg
      viewBox={viewBox}
      className={`${styles.drawing} ${kind === "notebook" ? styles.notebook : ""} ${className}`}
      fill="none"
      aria-hidden="true"
    >
      {kind === "notebook" && (
        <>
          <path className={styles.wash} d="M28 19 154 12l7 180-128 13-10-8Z" />
          <path className={styles.paper} d="m31 18 124-6 5 178-126 12-8-8Z" />
          <path d="M31 18q60-6 124-6l5 178q-62 7-126 12l-8-8 1-163q-1-9 4-13ZM38 19l3 174m-14 0 7 9m7-9 119-11M33 204q68-5 128-13" />
          <path
            className={styles.echo}
            d="m43 24 105-6 5 158M30 35l-1 149m13 12 112-10m-112 13 114-9"
          />
          <path className={styles.accent} d="m122 187 2 27 10-9 9 6-3-26" />
          <path d="M30 43c-19-7-17 15 1 6m0 23c-19-8-18 16 1 7m0 24c-18-7-18 15 1 7m0 22c-19-6-18 17 1 8m0 22c-19-7-18 15 1 8" />
          <path
            className={styles.echo}
            d="M22 44q-9 3 2 7m-1 25q-10 4 3 6m-4 22q-8 8 5 9m-4 22q-9 5 4 8m-4 20q-8 6 4 8"
          />
          <path
            className={styles.accent}
            d="M64 103q29-6 68-4m-64 9 61-3M99 81c-13-2-17-21-3-25 16-5 23 16 8 24"
          />
          <path d="m59 119 19-3 14 2 19-4 26 1m-78 10 29-3m21-1 22-2m-48 25 16-11 12 9-10 4-18-2Zm16-11 2 13m-12 5q12 4 24-2" />
          <path
            className={styles.echo}
            d="m65 164 65-6m-47 11 33-3m-59-90 8-3 7 2m47-27 7-3 7 1"
          />
        </>
      )}
      {kind === "bookmark" && (
        <>
          <path className={styles.wash} d="m18 6 28-1 1 51-14-9-13 10Z" />
          <path d="m18 6 28-1 1 51-14-9-13 10-2-51Zm7 7 14-1" />
          <path
            className={styles.echo}
            d="m23 20 16-1m-15 5 13-1m-15 27 10-8 10 7"
          />
        </>
      )}
      {kind === "pencil" && (
        <>
          <path d="m12 44 29-34 9 8-29 34-14 5 5-13Zm0 0 9 8m-4-9 27-31m-22 34 24-28m-35 32 4 4" />
          <path
            className={styles.accent}
            d="m41 10 5-5 9 8-5 5M9 59q18-7 40-5"
          />
        </>
      )}
      {kind === "arrow" && (
        <>
          <path d="M5 43c14-19 26-20 48-18m-12-10 13 10-13 10" />
          <path className={styles.echo} d="M7 46q19-22 42-19" />
        </>
      )}
    </svg>
  );
}
