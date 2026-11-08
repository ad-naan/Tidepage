"use client";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { VolumeX } from "lucide-react";
import { Button, IconButton } from "@/shared/ui/button/Button";
import { Link } from "@/shared/i18n/navigation";
import type { CoastPlayer, CoastSpeech } from "@/shared/contracts/coast-space";
import type { GuideAnswer } from "../domain/harbor-guide";
import type { HarborDestination } from "../domain/coast-harbor";
import styles from "./HarborSpeech.module.css";

export type HarborLocalSpeech = {
  id: string;
  speaker: "self" | "otter" | "turtle";
  text: string;
  expiresAt: number;
  answer?: GuideAnswer;
};
export function useHarborSpeech() {
  const [lines, setLines] = useState<HarborLocalSpeech[]>([]);
  const speak = useCallback(
    (
      speaker: HarborLocalSpeech["speaker"],
      text: string,
      answer?: GuideAnswer,
    ) => {
      setLines((current) => [
        ...current.filter((line) => line.speaker !== speaker),
        {
          id: crypto.randomUUID(),
          speaker,
          text,
          answer,
          expiresAt: Date.now() + 25_000,
        },
      ]);
    },
    [],
  );
  const clear = useCallback(() => setLines([]), []);
  return { lines, speak, clear };
}

export function HarborSpeech({
  host,
  local,
  speech,
  players,
  selfId,
  serverNow,
  walk,
  hidden,
}: {
  host: RefObject<HTMLDivElement | null>;
  local: HarborLocalSpeech[];
  speech: CoastSpeech[];
  players: CoastPlayer[];
  selfId: string;
  serverNow: () => number;
  walk: (destination: HarborDestination) => void;
  hidden: boolean;
}) {
  const t = useTranslations("world.harbor.speech");
  const companion = useTranslations("world.harbor.companion");
  const destinations = useTranslations("world.harbor.destinations");
  const [now, setNow] = useState(0);
  const [muted, setMuted] = useState<string[]>([]);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const localLines = local.filter((line) => line.expiresAt > now);
  const lines = [
    ...[...localLines].reverse(),
    ...[...speech]
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter(
        (line) =>
          line.expiresAt > serverNow() &&
          !muted.includes(line.playerId) &&
          !(
            line.playerId === selfId &&
            localLines.some((l) => l.speaker === "self")
          ),
      )
      .map((line) => ({
        id: line.id,
        speaker: line.playerId === selfId ? "self" : line.playerId,
        text: line.text,
        name: players.find((player) => player.id === line.playerId)?.name,
      })),
  ];
  return (
    <div
      ref={host}
      className={styles.layer}
      aria-hidden={hidden}
      data-hidden={hidden}
    >
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={t("voices")}
      >
        {lines.map((line) => {
          const npc = line.speaker === "otter" || line.speaker === "turtle";
          const name =
            line.speaker === "self"
              ? companion("you")
              : npc
                ? t(line.speaker === "otter" ? "otter" : "turtle")
                : ("name" in line && line.name) || t("traveler");
          const answer = "answer" in line ? line.answer : undefined;
          return (
            <div
              key={line.id}
              className={styles.bubble}
              data-world-speaker={line.speaker}
              data-visible="false"
              data-kind={npc ? "companion" : "player"}
            >
              <div className={styles.heading}>
                <span>{name}</span>
                {!npc && line.speaker !== "self" && (
                  <IconButton
                    aria-label={t("mute", { name })}
                    onClick={() => setMuted((ids) => [...ids, line.speaker])}
                  >
                    <VolumeX size={13} />
                  </IconButton>
                )}
              </div>
              <p>{line.text}</p>
              {answer?.destination && (
                <Button
                  variant="quiet"
                  onClick={() => walk(answer.destination!)}
                >
                  {companion("walk", {
                    destination: destinations(answer.destination),
                  })}
                </Button>
              )}
              {answer?.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.title}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      {!!muted.length && (
        <Button
          className={styles.unmute}
          variant="quiet"
          onClick={() => setMuted([])}
        >
          {t("unmute")}
        </Button>
      )}
    </div>
  );
}
