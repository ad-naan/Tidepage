import "server-only";
import type { Principal } from "@/modules/identity/domain/principal";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { defineRoute, jsonData } from "@/server/http/route";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { AppError } from "@/server/http/errors";
import {
  issueCoastIdentity,
  readCoastReceipt,
} from "@/server/realtime/coast-tokens";
import {
  coastMemoryQuerySchema,
  saveCoastMemorySchema,
} from "@/shared/contracts/coast-memories";
import type { coastMemoryStore } from "./memories";

export function createCoastRoutes(dependencies: {
  authorize: () => Promise<Principal>;
  policy: () => { secret?: string; hostId?: string };
  store: () => ReturnType<typeof coastMemoryStore>;
  clock?: () => number;
}) {
  const clock = dependencies.clock ?? Date.now;
  const secret = () => {
    const value = dependencies.policy().secret;
    if (!value || value.length < 32)
      throw new AppError("WORLD_UNAVAILABLE", "", 503);
    return value;
  };
  return {
    ticket: defineRoute(async (request, { requestId }) => {
      requireSameOrigin(request);
      const user = await dependencies.authorize();
      await enforceRateLimit(request, `coast-ticket:${user.id}`, 30, 60);
      return jsonData(
        {
          ticket: issueCoastIdentity(
            {
              subject: user.id,
              name: user.displayName.trim().slice(0, 60) || "·",
              host:
                user.role === "admin" &&
                user.id === dependencies.policy().hostId,
            },
            secret(),
            clock(),
          ),
        },
        requestId,
      );
    }),
    list: defineRoute(async (request, { requestId }) => {
      const user = await dependencies.authorize();
      await enforceRateLimit(request, `coast-memories:${user.id}`, 60, 60);
      const after = new URL(request.url).searchParams.get("after") ?? undefined;
      const input = coastMemoryQuerySchema.parse({ after });
      return jsonData(
        await dependencies.store().list(user.id, input.after),
        requestId,
      );
    }),
    save: defineRoute(async (request, { requestId }) => {
      requireSameOrigin(request);
      const user = await dependencies.authorize();
      await enforceRateLimit(request, `coast-save:${user.id}`, 60, 60);
      const input = saveCoastMemorySchema.parse(
        await boundedJson(request, 5000),
      );
      const receipt = readCoastReceipt(input.receipt, secret(), clock());
      if (!receipt || receipt.subject !== user.id)
        throw new AppError("WORLD_PROOF_INVALID", "", 403);
      return jsonData(
        await dependencies.store().save(user.id, receipt),
        requestId,
      );
    }),
  };
}
