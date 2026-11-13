"use client";

import { useEffect, useState } from "react";
import { siteAssets } from "@/shared/config/assets";
import animation from "@/modules/world/domain/hero-otter-animation.json";

/** Keep the decoded artwork mounted; playback changes only the sprite window. */
export function HeroOtter({
  playId,
  reducedMotion,
}: {
  playId: number;
  reducedMotion: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [greetReady, setGreetReady] = useState(false);
  const [frame, setFrame] = useState(-1);

  useEffect(() => {
    let active = true;
    const image = new Image();
    const markReady = reducedMotion ? setGreetReady : setReady;
    markReady(false);
    image.src = reducedMotion
      ? siteAssets.heroOtterGreet
      : siteAssets.heroOtterSprite;
    // An SVG image can finish loading before hydration attaches onLoad.
    void image.decode().then(
      () => active && markReady(true),
      () => active && markReady(false),
    );
    return () => {
      active = false;
    };
  }, [reducedMotion]);

  useEffect(() => {
    setFrame(-1);
    if (!playId || !(reducedMotion ? greetReady : ready)) return;

    setFrame(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    animation.durations.forEach((duration, index) => {
      if (index && !reducedMotion)
        timers.push(setTimeout(() => setFrame(index), elapsed));
      elapsed += duration;
    });
    timers.push(setTimeout(() => setFrame(-1), elapsed));
    return () => timers.forEach(clearTimeout);
  }, [playId, ready, greetReady, reducedMotion]);

  const waving = !reducedMotion && ready && frame >= 0;
  const greeting = reducedMotion && greetReady && frame >= 0;

  return (
    <g
      aria-hidden="true"
      data-otter-pose={waving ? "wave" : greeting ? "greet" : "rest"}
      data-otter-frame={frame}
    >
      <image
        href={siteAssets.heroOtterStill}
        x="168"
        y="150"
        width="126"
        height="110"
        preserveAspectRatio="xMidYMid meet"
        opacity={waving || greeting ? 0 : 1}
      />
      <svg
        x="168"
        y="150"
        width="126"
        height="110"
        viewBox={`0 0 ${animation.width} ${animation.height}`}
        overflow="hidden"
        opacity={waving ? 1 : 0}
      >
        <image
          href={reducedMotion ? undefined : siteAssets.heroOtterSprite}
          x={-Math.max(0, frame) * animation.width}
          width={animation.width * animation.durations.length}
          height={animation.height}
        />
      </svg>
      <image
        href={reducedMotion ? siteAssets.heroOtterGreet : undefined}
        x="168"
        y="150"
        width="126"
        height="110"
        preserveAspectRatio="xMidYMid meet"
        opacity={greeting ? 1 : 0}
      />
    </g>
  );
}
