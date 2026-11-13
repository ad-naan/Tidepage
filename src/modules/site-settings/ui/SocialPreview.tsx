type SocialPreviewProps = {
  name: string;
  title: string;
  description: string;
  byline: string;
  signature: string;
  otter: string;
  article?: boolean;
};

const ink = "#343a36";
const pencil = "#8c9083";
const sunset = "#d68549";

/** Static artwork for ImageResponse; no browser styles or interactive UI. */
export function SocialPreview({
  name,
  title,
  description,
  byline,
  signature,
  otter,
  article = false,
}: SocialPreviewProps) {
  const length = Array.from(title).reduce(
    (total, character) =>
      total + (/[^\u0000-\u024f]/u.test(character) ? 1 : 0.55),
    0,
  );
  const fontSize = article
    ? length > 42
      ? 46
      : length > 26
        ? 54
        : 64
    : length > 13
      ? 70
      : 88;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "#f8f7f2",
        color: ink,
        fontFamily: "Noto Serif SC",
        fontWeight: 500,
      }}
    >
      <svg
        width="1200"
        height="630"
        viewBox="0 0 1200 630"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <radialGradient id="sky">
            <stop stopColor="#f5d6b6" stopOpacity=".65" />
            <stop offset="1" stopColor="#f8f7f2" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#e9ab72" />
            <stop offset="1" stopColor="#f8e6c8" stopOpacity=".45" />
          </linearGradient>
          <linearGradient id="shore" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#e9e6d8" />
            <stop offset="1" stopColor="#f8f7f2" />
          </linearGradient>
          <pattern
            id="hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(28)"
          >
            <path d="M0 0V6" stroke={sunset} strokeWidth=".7" opacity=".3" />
          </pattern>
        </defs>
        <ellipse cx="980" cy="215" rx="440" ry="330" fill="url(#sky)" />
        <g
          fill="none"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g opacity=".6">
            <path d="M726 177q17-18 34-11 5-21 27-18 14-35 42-20 14 5 17 23 22-5 35 15M792 116q13-7 25 0M1027 137q12-22 30-13 7-31 32-20 14-24 37-11 22-1 29 21 26-6 40 13" />
            <path
              d="M711 192h93m27 0h64m153-44h65m40-5h47"
              stroke={sunset}
              opacity=".6"
            />
          </g>
          <circle
            cx="1004"
            cy="237"
            r="65"
            fill="url(#sun)"
            stroke={sunset}
            strokeWidth="1"
          />
          <circle cx="1004" cy="237" r="63" fill="url(#hatch)" stroke="none" />
          <path
            d="M681 309q138-5 247 0t286-2M730 318h129m42 0h49m118 0h110"
            opacity=".45"
          />
          <path
            d="m699 303 25-13 19-3 24-18 13 11 13-1 28 25m-95-3 39-27-9 16 15-6 18 15m-51 13h91"
            opacity=".75"
          />
          <g stroke={pencil} opacity=".48">
            {Array.from({ length: 20 }, (_, i) => (
              <path
                key={i}
                d={`M${672 + ((i * 83) % 500)} ${333 + Math.floor(i / 4) * 21}h${18 + ((i * 11) % 55)}`}
              />
            ))}
          </g>
          <path
            d="M960 325h88m-66 12h40m-65 13h97m-75 14h48m-62 14h78m-61 16h43m-56 14h68m-49 15h35"
            stroke={sunset}
            opacity=".55"
          />
          <path
            d="M648 427q47-26 89-6l49 13q40-18 76 1l53 29q35-11 62 11l56 34q44-14 79 17l57 31 53 39"
            fill="url(#shore)"
          />
          <path
            d="m665 437 38-13 32 9 19 30 37 13 31-29 30 7 31 29 16 33 37 13 35-25 39 13 21 31 42 7 31 31m-316-143 21-10 26 30-18-6m49 15-9 22 25 7m37-39-9 23 28-6 16 24m29 19-14 6 16 14m43-27 23-5-4 19 23 8"
            opacity=".75"
          />
          {Array.from({ length: 12 }, (_, i) => {
            const x = 682 + i * 38;
            const y = 452 + i * 8 + (i % 3) * 14;
            return (
              <g key={i} opacity=".65">
                <path
                  d={`M${x} ${y}q-1-15-8-20m8 20q5-15 12-17m-12 17 1-22`}
                  strokeWidth="1.1"
                />
                {i % 3 === 0 && (
                  <ellipse
                    cx={x + 12}
                    cy={y - 19}
                    rx="2.5"
                    ry="5"
                    fill={sunset}
                    stroke="none"
                    transform={`rotate(28 ${x + 12} ${y - 19})`}
                  />
                )}
              </g>
            );
          })}
          <path
            d="M714 104q14-3 24 8 5-17 23-22M883 77q12-3 20 7 5-12 18-17M1090 55q11-3 19 6 4-11 17-15"
            strokeWidth="2"
            opacity=".85"
          />
          <g transform="translate(866 351)">
            <path d="m0 27 23 4 31-4-13 14H14Z" fill="#efe9d9" />
            <path d="M26 29V1L7 24h19m5-20v25h17Z" fill="#faf9f5" />
            <path d="m26 1 12 4-12 5" fill={sunset} stroke="none" />
            <path d="M0 47h19m9 0h27m-46 5h33" stroke={sunset} opacity=".5" />
          </g>
          <path d="M76 517q112-4 237 0t264-1" stroke={pencil} opacity=".28" />
          <path d="M76 521q149-3 291 0" stroke={pencil} opacity=".14" />
          <g transform="translate(77 70)" stroke={sunset}>
            <path d="M0 4q7-8 15-3t16-1M0 12q7-8 15-3t16-1M0 20q7-8 15-3t16-1" />
          </g>
        </g>
      </svg>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 126,
          top: 62,
          fontSize: 23,
          color: "#757b70",
        }}
      >
        {article ? name : byline}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 76,
          top: article ? 151 : 174,
          width: 556,
          height: 324,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "block",
            fontSize,
            lineHeight: 1.35,
            letterSpacing: article ? -1 : 2,
            lineClamp: 3,
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "block",
            marginTop: 24,
            maxWidth: 500,
            fontSize: 25,
            lineHeight: 1.8,
            color: "#757b70",
            whiteSpace: "pre-wrap",
            lineClamp: 2,
            overflow: "hidden",
          }}
        >
          {description}
        </div>
      </div>
      <img
        src={otter}
        alt=""
        width={184}
        height={184}
        style={{ position: "absolute", left: 708, top: 265 }}
      />
      <img
        src={signature}
        alt=""
        width={164}
        height={32}
        style={{
          position: "absolute",
          left: 76,
          top: 550,
          objectFit: "contain",
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 269,
          top: 548,
          fontSize: 20,
          color: "#81867b",
        }}
      >
        {article ? byline : name}
      </div>
    </div>
  );
}
