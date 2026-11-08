"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  AudioLines,
  CornerDownLeft,
  Music2,
  Play,
} from "lucide-react";
import { Button } from "@/shared/ui/button/Button";
import type { MusicLyrics } from "@/shared/contracts/music";
import { lyricTime } from "@/modules/media/domain/lyrics";
import type { LyricsPhase } from "./useLyrics";
import styles from "./LyricsPanel.module.css";

export function LyricsPanel({
  document,
  phase,
  active,
  canSeek,
  onSeek,
  onRetry,
}: {
  document: MusicLyrics;
  phase: LyricsPhase;
  active: number;
  canSeek: boolean;
  onSeek: (time: number) => void;
  onRetry: () => void;
}) {
  const t = useTranslations("player.lyrics");
  const reduce = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<number, HTMLButtonElement>());
  const [following, setFollowing] = useState(true);
  const [focused, setFocused] = useState<number | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const initialized = useRef(false);
  function center(index: number, smooth: boolean) {
    const view = viewport.current,
      line = rows.current.get(Math.max(0, index));
    if (!view || !line) return;
    const offset =
      line.getBoundingClientRect().top -
      view.getBoundingClientRect().top +
      view.scrollTop;
    view.scrollTo({
      top: offset - (view.clientHeight - line.offsetHeight) / 2,
      behavior: smooth && !reduce ? "smooth" : "instant",
    });
  }
  useLayoutEffect(() => {
    if (following) center(active, initialized.current);
    initialized.current = true;
  }, [active, following, document, reduce]);
  useEffect(() => {
    const view = viewport.current;
    if (!view) return;
    const observer = new ResizeObserver(() => {
      if (following) center(activeRef.current, false);
    });
    observer.observe(view);
    return () => observer.disconnect();
  }, [following, phase]);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys = [...rows.current.keys()].sort((a, b) => a - b);
    const position = keys.indexOf(index);
    let next: number | undefined;
    if (event.key === "ArrowDown")
      next = keys[Math.min(keys.length - 1, position + 1)];
    else if (event.key === "ArrowUp") next = keys[Math.max(0, position - 1)];
    else if (event.key === "Home") next = keys[0];
    else if (event.key === "End") next = keys.at(-1);
    else return;
    event.preventDefault();
    setFollowing(false);
    if (next !== undefined) {
      rows.current.get(next)?.focus({ preventScroll: true });
      center(next, true);
    }
  }
  const timed = document.lines.length > 0;
  const firstText = document.lines.findIndex((line) => line.text);
  const focusIndex =
    focused ?? (document.lines[active]?.text ? active : firstText);
  return (
    <section
      className={styles.sheet}
      aria-label={t("region")}
      data-lyrics-phase={phase}
    >
      {phase === "ready" ? (
        <>
          <div
            ref={viewport}
            className={styles.viewport}
            data-custom-scroll={t("region")}
            onWheel={() => setFollowing(false)}
            onTouchStart={() => setFollowing(false)}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setFollowing(false);
            }}
          >
            <div className={styles.lines}>
              {timed
                ? document.lines.map((line, index) =>
                    line.text ? (
                      <Button
                        key={`${line.time}:${index}`}
                        pressEffect={false}
                        ref={(element) => {
                          if (element) rows.current.set(index, element);
                          else rows.current.delete(index);
                        }}
                        className={styles.line}
                        data-active={active === index}
                        data-past={index < active}
                        aria-current={active === index ? "true" : undefined}
                        aria-label={t("seek", {
                          time: lyricTime(line.time),
                          text: line.text,
                        })}
                        aria-disabled={!canSeek}
                        tabIndex={index === focusIndex ? 0 : -1}
                        onFocus={() => {
                          setFocused(index);
                          setFollowing(false);
                        }}
                        onBlur={() => setFocused(null)}
                        onKeyDown={(event) => keyboard(event, index)}
                        onClick={() => {
                          if (canSeek) {
                            onSeek(line.time);
                            setFollowing(true);
                          }
                        }}
                      >
                        <span className={styles.cue} aria-hidden="true">
                          <Play size={10} fill="currentColor" />
                          <span>{lyricTime(line.time)}</span>
                        </span>
                        <span className={styles.words}>
                          {line.text}
                          {line.translation && (
                            <span className={styles.translation}>
                              {line.translation}
                            </span>
                          )}
                        </span>
                        <span className={styles.currentMark} aria-hidden="true">
                          {active === index ? (
                            <AudioLines size={15} />
                          ) : (
                            <CornerDownLeft size={13} />
                          )}
                        </span>
                      </Button>
                    ) : (
                      <div
                        key={`${line.time}:${index}`}
                        className={styles.gap}
                        aria-label={t("interlude")}
                      >
                        <span aria-hidden="true">· · ·</span>
                      </div>
                    ),
                  )
                : document.plain.map((line, index) => (
                    <p className={styles.plainLine} key={index}>
                      {line}
                    </p>
                  ))}
            </div>
          </div>
          <footer className={styles.footer}>
            <span>
              {t(!timed ? "untimed" : following ? "seekHint" : "browsing")}
            </span>
            {timed && (
              <Button
                size="sm"
                className={styles.follow}
                aria-pressed={following}
                onClick={() => {
                  setFollowing(true);
                  center(active, true);
                }}
              >
                {following ? (
                  <AudioLines size={12} />
                ) : (
                  <ArrowUpRight size={13} />
                )}
                {t(following ? "following" : "resume")}
              </Button>
            )}
          </footer>
        </>
      ) : (
        <div className={styles.empty} role="status">
          <div className={styles.emptyMark} aria-hidden="true">
            <Music2 size={22} strokeWidth={1.2} />
          </div>
          <p>
            {t(
              phase === "loading"
                ? "loading"
                : phase === "error"
                  ? "error"
                  : "empty",
            )}
          </p>
          <span>{t(phase === "loading" ? "loadingHint" : "emptyHint")}</span>
          {phase === "error" && (
            <Button variant="quiet" size="sm" onClick={onRetry}>
              {t("retry")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
