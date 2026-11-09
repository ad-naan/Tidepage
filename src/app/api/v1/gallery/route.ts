import { setGalleryPublication } from "@/modules/content/server/gallery";
import { requirePrincipal } from "@/modules/identity/server";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { revalidatePath } from "next/cache";
import { localizedPath } from "@/shared/i18n/config";

function publicationRoute(visible: boolean) {
  return defineRoute(async (request, { requestId }) => {
    requireSameOrigin(request);
    const owner = await requirePrincipal(["admin"]);
    await enforceAccountRateLimit(owner.id, "gallery-publication", 30, 60);
    const result = await setGalleryPublication(
      owner.id,
      await boundedJson(request, 2048),
      visible,
    );
    revalidatePath(localizedPath(result.locale, "/gallery"));
    return jsonData(result, requestId);
  });
}

export const POST = publicationRoute(true);
export const DELETE = publicationRoute(false);
