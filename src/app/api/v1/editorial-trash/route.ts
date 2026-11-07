import {
  changeEditorialTrash,
  trashRequestSchema,
} from "@/modules/content/server/editorial-trash";
import {
  invalidateContentCache,
  invalidateNotePreview,
  invalidateProjectPreviews,
} from "@/modules/content/server";
import { requirePrincipal } from "@/modules/identity/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { log } from "@/server/observability/logger";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const user = await requirePrincipal(["author", "admin"]);
  const input = trashRequestSchema.parse(await boundedJson(request, 2048));
  await enforceAccountRateLimit(user.id, "editorial-trash", 40, 60);
  const { item, changed } = await changeEditorialTrash(
    user.id,
    user.role === "admin",
    input,
  );
  try {
    await Promise.all(
      changed.map((row) => {
        if ("slug" in row) return invalidateContentCache(row.slug, row.locale);
        if (input.kind === "notes") return invalidateNotePreview(row.locale);
        if (input.kind === "projects")
          return invalidateProjectPreviews(row.locale);
      }),
    );
  } catch {
    log("warn", "editorial_trash.cache_invalidation_failed", {
      requestId,
      component: "cache",
    });
  }
  return jsonData({ item, changed }, requestId);
});
