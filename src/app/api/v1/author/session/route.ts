import { z } from "zod";
import {
  createAuthorSession,
  deleteAuthorSession,
} from "@/modules/identity/server";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  await enforceRateLimit(request, "author-login", 10, 600);
  const { key } = z
    .object({ key: z.string().min(32).max(256) })
    .strict()
    .parse(await boundedJson(request, 1024));
  await createAuthorSession(key);
  return jsonData({ authenticated: true }, requestId);
});
export const DELETE = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  await deleteAuthorSession();
  return jsonData({ authenticated: false }, requestId);
});
