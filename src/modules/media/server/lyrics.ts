import "server-only";
import { createHash } from "node:crypto";
import { readPublicText } from "@/server/http/public-text";
import { AppError, notFoundError } from "@/server/http/errors";
import { parseLyrics } from "../domain/lyrics";
import type { MusicLyrics, MusicSettings } from "@/shared/contracts/music";
import { getMusicPlaylist } from "./music";

export function createLyricsLoader(read = readPublicText, now = Date.now) {
  const cache = new Map<
    string,
    { value: MusicLyrics | null; expires: number }
  >();
  const pending = new Map<string, Promise<MusicLyrics>>();
  return async (url: string): Promise<MusicLyrics> => {
    const cached = cache.get(url);
    if (cached && cached.expires > now()) {
      if (cached.value) return cached.value;
      throw new AppError("LYRICS_UNAVAILABLE", "", 502);
    }
    if (pending.has(url)) return pending.get(url)!;
    if (pending.size >= 4) throw new AppError("LYRICS_UNAVAILABLE", "", 503);
    const task = (async () => {
      const signal = AbortSignal.timeout(8000);
      let abort: () => void = () => {};
      const deadline = new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
      });
      try {
        const raw = await Promise.race([read(url, signal), deadline]);
        // Error documents must not masquerade as untimed lyrics.
        if (/^\s*(?:<!doctype|<html|\{\s*")/i.test(raw))
          throw new Error("Invalid lyrics");
        const value = parseLyrics(raw);
        if (cache.size >= 64) cache.delete(cache.keys().next().value!);
        cache.set(url, { value, expires: now() + 600_000 });
        return value;
      } catch {
        if (cache.size >= 64) cache.delete(cache.keys().next().value!);
        cache.set(url, { value: null, expires: now() + 15_000 });
        throw new AppError("LYRICS_UNAVAILABLE", "", 502);
      } finally {
        signal.removeEventListener("abort", abort);
      }
    })().finally(() => pending.delete(url));
    pending.set(url, task);
    return task;
  };
}

const loadLyrics = createLyricsLoader();
export const musicTrackKey = (source: string) =>
  createHash("sha256").update(source).digest("hex").slice(0, 24);

export async function getMusicLyrics(
  settings: MusicSettings,
  trackKey: string,
) {
  // Only current, configured playlist members can cause an outbound request.
  const track = (await getMusicPlaylist(settings)).find(
    (item) => musicTrackKey(item.source) === trackKey,
  );
  if (!track) throw notFoundError();
  return track.lyricsSource
    ? loadLyrics(track.lyricsSource)
    : { lines: [], plain: [] };
}
