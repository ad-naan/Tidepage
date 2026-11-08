"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/shared/http/client";
import type { MusicLyrics, MusicTrack } from "@/shared/contracts/music";

export type LyricsPhase = "loading" | "ready" | "empty" | "error";
const empty: MusicLyrics = { lines: [], plain: [] };
const cache = new Map<string, MusicLyrics>();

export function useLyrics(track: MusicTrack | undefined) {
  const key = track?.lyricsKey;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key?: string;
    phase: LyricsPhase;
    document: MusicLyrics;
  }>({ phase: "empty", document: empty });
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    const accept = (document: MusicLyrics) =>
      setState({
        key,
        document,
        phase:
          document.lines.length || document.plain.length ? "ready" : "empty",
      });
    const saved = cache.get(key);
    if (saved) {
      accept(saved);
      return;
    }
    setState({ key, phase: "loading", document: empty });
    void apiGet<MusicLyrics>(
      `/api/v1/music/lyrics?track=${encodeURIComponent(key)}`,
      { signal: controller.signal },
    )
      .then((document) => {
        if (controller.signal.aborted) return;
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(key, document);
        accept(document);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, phase: "error", document: empty });
      });
    return () => controller.abort();
  }, [key, attempt]);
  return {
    document: key && state.key === key ? state.document : empty,
    phase: !key ? "empty" : state.key === key ? state.phase : "loading",
    retry: () => setAttempt((value) => value + 1),
  } as { document: MusicLyrics; phase: LyricsPhase; retry: () => void };
}
