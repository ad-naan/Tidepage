import { z } from "zod";
import { safeWebUrl } from "@/shared/contracts/rich-text";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { getLinkPreview } from "@/server/http/link-preview";

export const runtime = "nodejs";
const querySchema = z.object({ url: safeWebUrl.max(2048) }).strict();
export const GET = defineRoute(async (request, { requestId }) => {
  const { url } = querySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  await enforceRateLimit(request, "link-preview", 60, 60);
  return jsonData(await getLinkPreview(url), requestId);
});
