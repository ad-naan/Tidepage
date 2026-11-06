import "server-only";
import type { Principal } from "@/modules/identity/domain/principal";
import type { discussionStore, requireDiscussionTarget } from "./index";
import {
  discussionQuerySchema,
  newCommentSchema,
} from "@/modules/engagement/domain/discussion";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export function createDiscussionRoutes(dependencies: {
  store: () => ReturnType<typeof discussionStore>;
  requireTarget: typeof requireDiscussionTarget;
  authorize: () => Promise<Principal>;
}) {
  return {
    list: defineRoute(async (request, { requestId }) => {
      const query = discussionQuerySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      await dependencies.requireTarget(
        { type: query.type, id: query.id },
        query.locale,
      );
      return jsonData(await dependencies.store().list(query), requestId);
    }),
    create: defineRoute(async (request, { requestId }) => {
      requireSameOrigin(request);
      const user = await dependencies.authorize();
      await enforceRateLimit(request, `comment:${user.id}`, 10, 60);
      const input = newCommentSchema.parse(
        await boundedJson(request, 32 * 1024),
      );
      await dependencies.requireTarget(input.target, input.locale);
      return jsonData(
        await dependencies.store().create(user.id, input),
        requestId,
        { status: 201 },
      );
    }),
  };
}
