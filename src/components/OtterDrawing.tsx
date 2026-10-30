/** A three-quarter profile, with the muzzle lifted toward the evening sun. */
export function OtterDrawing() {
  return (
    <g
      color="var(--otter-ink, currentColor)"
      stroke="currentColor"
      strokeWidth="1.05"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M31 61C14 61 3 71-15 73q-12 1-22-3 18 13 40 11l38-8"
        fill="var(--otter-fur, var(--sand))"
      />
      <path
        d="M34 28C23 34 16 48 17 62q2 16 25 16 22 0 26-13 3-12-5-26L54 28"
        fill="var(--otter-fur, var(--sand))"
      />
      <path
        d="M52 32q-10 7-12 21-1 14 10 17 12-1 13-13l-5-20"
        fill="var(--otter-muzzle, var(--paper))"
        strokeOpacity=".3"
      />
      <g transform="rotate(-12 47 24)">
        <path
          d="M29 34C20 28 20 15 28 9 36 3 47 4 55 9q7 4 10 8l8 1q7 2 4 7-3 5-13 6-6 12-20 11-10-1-15-8Z"
          fill="var(--otter-fur, var(--sand))"
        />
        <path
          d="M32 18q-6-2-5-7 2-5 7-3 5 2 3 7"
          fill="var(--otter-fur, var(--sand))"
        />
        <path
          d="M31 12q3-1 3 3"
          fill="none"
          strokeOpacity=".4"
          strokeWidth=".8"
        />
        <path
          d="M58 22q5-5 13-3 8 1 6 6-3 5-13 6-3 7-10 7-6-1-5-5"
          fill="var(--otter-muzzle, var(--paper))"
          strokeOpacity=".3"
        />
        <ellipse
          cx="74"
          cy="20"
          rx="3.6"
          ry="2.7"
          fill="currentColor"
          stroke="none"
        />
        <path d="m72 23-2 4q-4 4-9 2" fill="none" strokeWidth=".85" />
        <ellipse
          cx="57"
          cy="17"
          rx="1.6"
          ry="1.8"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="57.5"
          cy="16.5"
          r=".45"
          fill="var(--otter-muzzle, var(--paper))"
          stroke="none"
        />
        <path
          d="m65 27 17-3m-18 6 17 1m-20 2 14 5"
          strokeOpacity=".65"
          strokeWidth=".7"
        />
      </g>
      <path
        d="M48 43q-2 10 6 13 7 1 7-4l-4-6m-22 1q-1 10 9 13 6 0 4-5l-5-6"
        fill="var(--otter-fur, var(--sand))"
      />
      <path
        d="M23 68q-5 6 5 9l9-2m17-6q12 3 8 7l-13 1"
        fill="var(--otter-fur, var(--sand))"
      />
      <path
        d="m25 72 2 3m3-4 2 4m23-3 2 3m-9-3 2 3M21 43l-1 5m0 6 1 4M19 65l2 2M2 75l10-3"
        strokeOpacity=".3"
        strokeWidth=".8"
      />
    </g>
  );
}
