import { localeQuerySchema } from "@/shared/i18n/schema";
import { getNotes } from "@/modules/content/server";
import { defineRoute, jsonData } from "@/server/http/route";
import { publishNote } from "@/modules/content/server/publish-note";
import { requirePrincipal } from "@/modules/identity/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceRateLimit } from "@/server/http/rate-limit";
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
  await enforceRateLimit(request, `publish-note:${user.id}`, 20, 60);
  return jsonData(
    await publishNote(user.id, await boundedJson(request, 2048)),
    requestId,
  );
});
