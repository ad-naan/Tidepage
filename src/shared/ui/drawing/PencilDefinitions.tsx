/** Static graphite texture, shared by line art without animating the noise field. */
export function PencilDefinitions() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <defs>
        <filter
          id="tidepage-pencil"
          x="-8%"
          y="-50%"
          width="116%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".72"
            numOctaves="3"
            seed="7"
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale=".7"
            xChannelSelector="R"
            yChannelSelector="G"
            result="rough"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1.5 0 -.55"
            result="tooth"
          />
          <feComposite in="rough" in2="tooth" operator="out" />
        </filter>
      </defs>
    </svg>
  );
}
