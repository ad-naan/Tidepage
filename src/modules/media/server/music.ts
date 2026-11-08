import type { MusicSettings, MusicTrack } from "@/shared/contracts/music";
import "server-only";
import { readPublicJson } from "@/server/http/public-json";
import { AppError } from "@/server/http/errors";
import { metingPlaylistUrl, parseMetingPlaylist } from "../domain/music";

export function createMusicPlaylistLoader(
  read = readPublicJson,
  now = Date.now,
) {
  const cache = new Map<
    string,
    { tracks: MusicTrack[] | null; expires: number }
  >();
  const pending = new Map<string, Promise<MusicTrack[]>>();
  return async (settings: MusicSettings): Promise<MusicTrack[]> => {
    if (!settings.enabled) return [];
    const key = metingPlaylistUrl(settings);
    const cached = cache.get(key);
    if (cached && cached.expires > now()) {
      if (cached.tracks) return cached.tracks;
      throw new AppError("MUSIC_UNAVAILABLE", "", 502);
    }
    if (pending.has(key)) return pending.get(key)!;
    if (pending.size >= 4) throw new AppError("MUSIC_UNAVAILABLE", "", 503);
    const task = (async () => {
      const signal = AbortSignal.timeout(12_000);
      let abort: () => void = () => {};
      const timeout = new Promise<never>((_, reject) => {
        abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
      });
      try {
        const tracks = parseMetingPlaylist(
          await Promise.race([read(key, signal), timeout]),
        );
        if (!tracks.length) throw new Error("Empty playlist");
        if (cache.size >= 16) cache.delete(cache.keys().next().value!);
        cache.set(key, { tracks, expires: now() + 300_000 });
        return tracks;
      } catch {
        if (cache.size >= 16) cache.delete(cache.keys().next().value!);
        cache.set(key, { tracks: null, expires: now() + 15_000 });
        throw new AppError("MUSIC_UNAVAILABLE", "", 502);
      } finally {
        signal.removeEventListener("abort", abort);
      }
    })().finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  };
}

export const getMusicPlaylist = createMusicPlaylistLoader();
