import { z } from "zod";
import { readPublicMusicSettings } from "@/modules/site-settings/server";
import { getMusicLyrics } from "@/modules/media/server/lyrics";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";
export const GET = defineRoute(async (request, { requestId }) => {
  const { track } = z
    .object({ track: z.string().regex(/^[a-f0-9]{24}$/) })
    .strict()
    .parse(Object.fromEntries(new URL(request.url).searchParams));
  await enforceRateLimit(request, "music-lyrics", 120, 60);
  return jsonData(
    await getMusicLyrics(await readPublicMusicSettings(), track),
    requestId,
  );
});
