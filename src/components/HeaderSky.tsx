export function HeaderSky() {
  return (
    <>
      <svg
        className="header-sky-definition"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <defs>
          <path
            id="header-sky-outline"
            d="M34 27C71 16 95 24 137 19S216 26 267 18s73-10 128-2 78-3 132-1 74 7 128 1 88-2 143 1 81-7 135-2 74 0 131 3 95-5 152 1 92-3 134 6c25 6 29 11 28 25s10 22 1 37c-8 14-29 11-64 14s-73-7-126-1-80 6-126-1-87 7-142 1-89 1-137 2-83-7-136-1-93-4-142 0-82 3-127-1-86 6-135-1-94 2-128-1C12 96 17 82 14 70S7 35 34 27Z"
          />
          <clipPath id="header-sky-cut" clipPathUnits="objectBoundingBox">
            <use
              href="#header-sky-outline"
              transform="scale(.0006944444 .0083333333)"
            />
          </clipPath>
          <linearGradient id="header-sky-wash" x1="0" y1="0" x2="1" y2=".7">
            <stop className="header-wash-rose" offset="0" />
            <stop className="header-wash-milk" offset=".47" />
            <stop className="header-wash-gold" offset="1" />
          </linearGradient>
          <filter
            id="header-sky-soft-edge"
            x="-8%"
            y="-50%"
            width="116%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>
      </svg>
      <svg
        className="header-floating-wash"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <use
          href="#header-sky-outline"
          fill="url(#header-sky-wash)"
          filter="url(#header-sky-soft-edge)"
        />
      </svg>
      <div className="header-sky-shadow" aria-hidden="true">
        <span />
      </div>
      <div className="header-sky" aria-hidden="true">
        <svg viewBox="0 0 1440 100" fill="none" preserveAspectRatio="none">
          <defs>
            <clipPath id="header-sky-orb-window">
              <rect x="390" y="0" width="90" height="82" />
            </clipPath>
          </defs>
          <g clipPath="url(#header-sky-orb-window)">
            <g className="header-sunset-orb">
              <circle className="header-orb-halo" r="25" />
              <circle className="header-orb-disc" r="12" />
              <path
                className="header-orb-pencil"
                d="M-9 4 5-10M-7 8 9-8M-3 10 11-4M-11 0-2-10M1 11 11 2"
              />
            </g>
            <g className="header-moon-orb">
              <circle className="header-orb-halo" r="25" />
              <path d="M5-11A12 12 0 1 0 11 6 10 10 0 0 1 5-11Z" />
            </g>
          </g>
          <g className="header-pencil-skyline" filter="url(#tidepage-pencil)">
            <path
              className="header-skyline-coast"
              pathLength="100"
              d="M-20 80C37 77 79 83 138 80s77-5 121-2 71 4 122 1 76-2 122 0 83-4 129-2 76 5 129 1 76-1 125 0 78-3 129 0 82 2 124-1 77 2 124 0 83-3 127-1 75 1 124-2"
            />
            <path
              className="header-skyline-echo"
              d="M-5 85c106-4 192 3 286-1s185 3 287-1 201 2 306-1 213 3 323-2 169 1 253-1"
            />
            <path
              className="header-skyline-hatching"
              d="m32 81-5 5m15-5-5 6m20-6-4 5m90-6-4 6m14-7-4 5m163-5-4 7m15-6-3 4m246-5-5 6m13-6-3 5m113-5-4 6m14-7-4 6m177-5-5 6m14-6-4 5m248-6-5 6m15-6-4 5m97-7-4 7m14-7-3 5"
            />
          </g>
          <g className="header-clouds">
            <path d="M180 32q13-13 27-8 5-16 24-16 23-1 31 19 15-4 23 8m-91 5h66m593-5q15-18 30-12 4-17 24-18 25-2 32 21 17-5 30 13m-65 8h81M1168 31q12-15 29-10 4-14 21-14 19-1 26 17 15-4 24 7" />
            <path d="M316 25h72m-58 6h93m295-15h62m293 40h91" />
          </g>
          <g className="header-sky-specks">
            <circle cx="458" cy="19" r="1" />
            <circle cx="633" cy="31" r=".75" />
            <circle cx="1040" cy="16" r="1.2" />
            <path d="m714 6 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" />
          </g>
        </svg>
        <span className="header-dusk-streak header-dusk-streak-one" />
        <span className="header-dusk-streak header-dusk-streak-two" />
      </div>
    </>
  );
}
