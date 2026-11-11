"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button/Button";

const interactions = ["notes", "projects", "quotes", "gallery"] as const;
type InteractiveRoom = (typeof interactions)[number];

/** The button stays mounted while its local drawing restarts, preserving focus. */
export function InteractiveHeadingSketch({
  room,
  className,
  description,
  children,
}: {
  room: string;
  className: string;
  description: string;
  children: ReactNode;
}) {
  const t = useTranslations("easterEggs");
  const [play, setPlay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!interactions.includes(room as InteractiveRoom)) {
    return (
      <div className={className} title={description}>
        {children}
      </div>
    );
  }
  return (
    <Button
      className={className}
      data-sketch-room={room}
      data-playing={playing || undefined}
      aria-label={t(room as InteractiveRoom)}
      pressEffect={false}
      onClick={() => {
        clearTimeout(timer.current);
        setPlay((value) => value + 1);
        setPlaying(true);
        timer.current = setTimeout(() => setPlaying(false), 2200);
      }}
    >
      <span key={play} data-sketch-canvas="true">
        {children}
      </span>
    </Button>
  );
}
