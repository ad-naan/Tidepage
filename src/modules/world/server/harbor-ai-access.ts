import "server-only";
import { isSiteGuideEnabled, type ModelAccess } from "@/modules/ai/server";
import { requirePrincipal } from "@/modules/identity/server";
import { AppError } from "@/server/http/errors";
import { requireSameOrigin } from "@/server/http/origin";
import {
  clientKey,
  enforceAccountRateLimit,
  enforceRateLimit,
} from "@/server/http/rate-limit";

export async function requireHarborAiAccess(
  request: Request,
): Promise<ModelAccess> {
  requireSameOrigin(request);
  if (!isSiteGuideEnabled())
    throw new AppError("AI_UNAVAILABLE", "The harbor guide is disabled", 503);
  const user = await requirePrincipal();
  await enforceAccountRateLimit(user.id, "harbor-ai", 10, 60);
  if (clientKey(request) !== "anonymous")
    await enforceRateLimit(request, "harbor-ai", 30, 60);
  return { audience: "harbor", accountId: user.id };
}
