import "server-only";
import type { Principal } from "@/modules/identity/domain/principal";
import type { interactionStore } from "./interactions";
import type {
  requireEngagementTarget,
  requireEngagementTargets,
} from "./targets";
import {
  interactionChangeSchema,
  interactionQuerySchema,
} from "@/modules/engagement/domain/interactions";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export function createInteractionRoutes(dependencies: {
  store: () => ReturnType<typeof interactionStore>;
  currentUser: () => Promise<Principal | null>;
  authorize: () => Promise<Principal>;
  requireTarget: typeof requireEngagementTarget;
  requireTargets: typeof requireEngagementTargets;
}) {
  return {
    read: defineRoute(async (request, { requestId }) => {
      const params = new URL(request.url).searchParams;
      const input = interactionQuerySchema.parse({
        type: params.get("type"),
        ids: params.getAll("id"),
        locale: params.get("locale"),
      });
      await dependencies.requireTargets(input.type, input.ids, input.locale);
      const user = await dependencies.currentUser();
      return jsonData(
        await dependencies.store().read(input, user?.id ?? null),
        requestId,
      );
    }),
    set: defineRoute(async (request, { requestId }) => {
      requireSameOrigin(request);
      const user = await dependencies.authorize();
      await enforceAccountRateLimit(user.id, "interaction", 120, 60);
      const input = interactionChangeSchema.parse(
        await boundedJson(request, 2048),
      );
      await dependencies.requireTarget(input.target, input.locale);
      return jsonData(
        await dependencies.store().set(user.id, input),
        requestId,
      );
    }),
  };
}
