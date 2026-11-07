import { localeQuerySchema } from "@/shared/i18n/schema";
import { getNotes, invalidateNotePreview } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
import { publishNote } from "@/modules/content/server/publish-note";
import { requirePrincipal } from "@/modules/identity/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { log } from "@/server/observability/logger";
export const GET = defineRoute(async (request, { requestId }) =>
  jsonData(
    await getNotes(
      localeQuerySchema.parse(
        new URL(request.url).searchParams.get("locale") ?? undefined,
      ),
    ),
    requestId,
  ),
);
export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  await enforceAccountRateLimit(user.id, "publish-note", 20, 60);
  const note = await publishNote(user.id, await boundedJson(request, 2048));
  try {
    await invalidateNotePreview(note.locale);
  } catch {
    log("warn", "note.cache_invalidation_failed", {
      requestId,
      component: "cache",
    });
  }
  return jsonData(note, requestId);
});
