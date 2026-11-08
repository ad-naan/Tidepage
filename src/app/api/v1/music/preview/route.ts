import { requirePrincipal } from "@/modules/identity/server";
import { musicSettingsSchema } from "@/shared/contracts/music";
import { getMusicPlaylist } from "@/modules/media/server/music";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export const runtime = "nodejs";
export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["admin"]);
  await enforceAccountRateLimit(user.id, "music-preview", 10, 60);
  const settings = musicSettingsSchema
    .refine((value) => Boolean(value.playlistId), { path: ["playlistId"] })
    .parse(await boundedJson(request, 4096));
  const tracks = await getMusicPlaylist({ ...settings, enabled: true });
  return jsonData(
    {
      count: tracks.length,
      titles: tracks.slice(0, 5).map((track) => track.title),
    },
    requestId,
  );
});
