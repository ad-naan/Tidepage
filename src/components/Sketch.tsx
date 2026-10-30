"use client";
export { HeroSketch } from "@/modules/world/ui/CoastIllustration";

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
