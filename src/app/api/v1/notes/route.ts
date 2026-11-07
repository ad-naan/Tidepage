import { localeQuerySchema } from "@/shared/i18n/schema";
import {
  getNote,
  getNotes,
  invalidateNotePreview,
} from "@/modules/content/server";
import { collectionItemId } from "@/modules/content/domain/managed-collections";
import { notFoundError } from "@/server/http/errors";
import { defineRoute, jsonData } from "@/server/http/route";
import { publishNote } from "@/modules/content/server/publish-note";
import { requirePrincipal } from "@/modules/identity/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { log } from "@/server/observability/logger";
export const GET = defineRoute(async (request, { requestId }) => {
  const params = new URL(request.url).searchParams;
  const locale = localeQuerySchema.parse(params.get("locale") ?? undefined);
  const id = params.get("id");
  if (id === null) return jsonData(await getNotes(locale), requestId);
  const note = await getNote(collectionItemId.parse(id), locale);
  if (!note) throw notFoundError();
  return jsonData(note, requestId);
});
export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  await enforceAccountRateLimit(user.id, "publish-note", 20, 60);
  const note = await publishNote(
    user.id,
    await boundedJson(request, 2048),
    undefined,
    user.role === "admin",
  );
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
