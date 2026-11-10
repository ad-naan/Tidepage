import { revalidatePath } from "next/cache";
import { requirePrincipal } from "@/modules/identity/server";
import {
  invalidateArticleLists,
  invalidateNotePreview,
  invalidateProjectPreviews,
} from "@/modules/content/server";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import {
  readPublicListOrder,
  savePublicListOrder,
} from "@/server/workbench/public-list-order";
import { publicListQuerySchema } from "@/shared/contracts/public-list-order";
import { localizedPath } from "@/shared/i18n/config";

export const GET = defineRoute(async (request, { requestId }) => {
  await requirePrincipal(["admin"]);
  const { kind, locale } = publicListQuerySchema.parse(
    Object.fromEntries(new URL(request.url).searchParams),
  );
  return jsonData(await readPublicListOrder(kind, locale), requestId);
});

export const PUT = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const owner = await requirePrincipal(["admin"]);
  await enforceAccountRateLimit(owner.id, "public-list-order", 30, 60);
  const result = await savePublicListOrder(
    await boundedJson(request, 2 * 1024 * 1024),
  );
  const { kind, locale } = result;
  if (kind === "articles") await invalidateArticleLists(locale);
  if (kind === "notes") await invalidateNotePreview(locale);
  if (kind === "projects") await invalidateProjectPreviews(locale);
  revalidatePath(localizedPath(locale, "/"), "layout");
  return jsonData(result, requestId);
});
