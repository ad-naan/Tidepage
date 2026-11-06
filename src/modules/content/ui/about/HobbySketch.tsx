import styles from "./HobbySketch.module.css";

const drawings = [
  <g key="music"><path d="M30 88V60c0-24 18-43 41-43s42 18 42 43v27M39 63V58c0-20 13-32 32-32s33 13 33 33v8"/><path d="M28 62c-9 0-14 8-14 19 0 12 5 20 15 20l8-3V65ZM114 64c10 0 15 8 15 19s-5 20-14 20l-8-5V67Z" fill="var(--paper)"/><path d="M113 103c-2 9-11 16-26 15h-8M38 71v18m68-17v19"/><path d="m143 34 1 24m0-20 14-4v18m-15 4c-7-4-12 6-5 8 5 1 9-2 5-8Zm15-6c-7-3-11 5-5 8 6 1 9-4 5-8Z" stroke="var(--accent)"/><path d="M14 113c20 7 38 7 49 4m33 12 29-3" opacity=".3"/></g>,
  <g key="reading"><path d="m20 35 53 8 50-17 12 79-51 18-51-9Z" fill="var(--paper)"/><path d="m20 35 15-11 51 7 45-18 4 92-51 18-51-9Zm15-11 13 76 36 8m2-77-2 77m-9-65 9 80M43 42l27 5m-24 8 25 5m-22 8 23 5m24-28 24-9m-24 22 24-8m-23 21 25-8"/><path d="m104 22 3 28 6-7 8 3-4-28" stroke="var(--accent)" fill="var(--wash)"/><path d="m28 124 47 5m19 0 33-9" opacity=".3"/></g>,
  <g key="walking"><path d="M14 109c4-15 33-15 40-30 10-23-26-13-21-34 3-14 23-19 43-16" strokeDasharray="3 6"/><path d="m72 24 10 5-11 5M45 104c11 0 20 3 26 9l-7 7-22-3Zm4-21 8-5 6 17-9 4Z"/><path d="M95 92c13-12 22-8 27-5l17-12 19 15m-43 12 39-1" opacity=".55"/><circle cx="125" cy="37" r="16" stroke="var(--accent)" fill="var(--wash)"/><path d="m102 32-7-1m28-17V7m22 20 6-4m-46 85 24-1" stroke="var(--accent)" opacity=".5"/></g>,
  <g key="tea"><path d="M33 57c-2 38 8 50 32 50 24 0 33-17 33-48M34 57q30-10 65 0c-7 10-53 9-65 0ZM98 64c28-7 27 26-4 27M28 109q38 19 79-1M41 121l42 2" fill="var(--paper)"/><path d="M55 42c-14-16 13-17 1-31m20 30c-10-13 12-17 4-29" stroke="var(--accent)"/><path d="M22 114c-5 18 96 20 101 1m-16 14 11-2" opacity=".32"/><path d="m130 77 15 11-7 20-19-8Zm-2 1 3-18" stroke="var(--accent)"/><path d="M37 60q27 9 58 0" stroke="var(--accent)" opacity=".6"/></g>,
];

export function HobbySketch({index}: {index:number}) {
  return <svg className={styles.sketch} viewBox="0 0 170 145" fill="none" aria-hidden="true"><ellipse className={styles.wash} cx="81" cy="77" rx="61" ry="49"/><g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" filter="url(#tidepage-pencil)">{drawings[index]}</g></svg>;
}
