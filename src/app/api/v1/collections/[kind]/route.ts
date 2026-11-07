import {
  collectionItemId,
  editorialCollectionSchema,
} from "@/modules/content/domain/managed-collections";
import {
  openPublishedCollection,
  publishEditorialCollection,
} from "@/modules/content/server/managed-collections";
import { invalidateProjectPreviews } from "@/modules/content/server";
import { requirePrincipal } from "@/modules/identity/server";
import { boundedJson } from "@/server/http/body";
import { notFoundError } from "@/server/http/errors";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { log } from "@/server/observability/logger";

export const GET = defineRoute<{ kind: string }>(
  async (request, { params, requestId }) => {
    await requirePrincipal(["admin"]);
    const kind = editorialCollectionSchema.parse((await params).kind);
    const id = collectionItemId.parse(
      new URL(request.url).searchParams.get("id"),
    );
    return jsonData(await openPublishedCollection(kind, id), requestId);
  },
);

export const POST = defineRoute<{ kind: string }>(
  async (request, { params, requestId }) => {
    requireSameOrigin(request);
    const owner = await requirePrincipal(["admin"]);
    const kind = editorialCollectionSchema.parse((await params).kind);
    if (kind === "notes") throw notFoundError();
    await enforceAccountRateLimit(owner.id, "publish-collection", 30, 60);
    const item = await publishEditorialCollection(
      owner.id,
      kind,
      await boundedJson(request, 2048),
    );
    if (kind === "projects") {
      try {
        await invalidateProjectPreviews(item.locale);
      } catch {
        log("warn", "project.cache_invalidation_failed", {
          requestId,
          component: "cache",
        });
      }
    }
    return jsonData(item, requestId);
  },
);
