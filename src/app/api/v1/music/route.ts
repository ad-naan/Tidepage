import { readPublicMusicSettings } from "@/modules/site-settings/server";
import { getMusicPlaylist } from "@/modules/media/server/music";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { musicTrackKey } from "@/modules/media/server/lyrics";

export const runtime = "nodejs";
export const GET = defineRoute(async (request, { requestId }) => {
  await enforceRateLimit(request, "music", 120, 60);
  const settings = await readPublicMusicSettings();
  return jsonData(
    {
      enabled: settings.enabled,
      tracks: (await getMusicPlaylist(settings)).map(
        ({ lyricsSource, ...track }) => ({
          ...track,
          ...(lyricsSource ? { lyricsKey: musicTrackKey(track.source) } : {}),
        }),
      ),
    },
    requestId,
  );
});
