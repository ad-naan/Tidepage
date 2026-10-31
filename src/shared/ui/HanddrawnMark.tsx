/** A small uneven pencil flourish shared by navigation states. */
export function HanddrawnMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ filter: "url(#tidepage-pencil)" }}
    >
      <path
        pathLength="100"
        d="M2 8C14 4.5 29 8 44 5.5s13-1.2 18-1M20 7l-5 4 13-5.5-4.5 4.5 12-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        pathLength="100"
        d="M3 8.7q18-3.3 35-2.1t22-2M17 11l12-5"
        stroke="currentColor"
        strokeWidth=".8"
        opacity=".4"
        strokeLinecap="round"
      />
    </svg>
  );
}
