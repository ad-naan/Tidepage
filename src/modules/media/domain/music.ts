import {
  musicHttpsUrl as httpsUrl,
  type MusicSettings,
  type MusicTrack,
} from "@/shared/contracts/music";

export function metingPlaylistUrl(settings: MusicSettings) {
  const url = new URL(settings.apiUrl);
  url.searchParams.set("server", settings.server);
  url.searchParams.set("type", "playlist");
  url.searchParams.set("id", settings.playlistId);
  return url.href;
}

// Public deployments use either name/artist or title/author. Reject malformed
// records individually, but never treat an HTML error page as an empty playlist.
export function parseMetingPlaylist(value: unknown): MusicTrack[] {
  if (!Array.isArray(value)) throw new Error("Invalid Meting playlist");
  const tracks: MusicTrack[] = [];
  const seen = new Set<string>();
  for (const item of value.slice(0, 1000)) {
    if (!item || typeof item !== "object") continue;
    const title = item.name ?? item.title;
    const artist = item.artist ?? item.author;
    if (
      typeof title !== "string" ||
      !title.trim() ||
      !httpsUrl.safeParse(item.url).success
    )
      continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    tracks.push({
      title: title.trim().slice(0, 300),
      artist: typeof artist === "string" ? artist.slice(0, 300) : "",
      source: item.url,
      cover: httpsUrl.safeParse(item.pic).success ? item.pic : "",
    });
  }
  return tracks;
}
