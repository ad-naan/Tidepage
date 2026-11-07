import { requirePrincipal } from "@/modules/identity/server";
import { isSiteGuideEnabled } from "@/modules/ai/server";
import { guideRequestSchema } from "@/modules/world/domain/harbor-guide";
import { answerHarborGuide } from "@/modules/world/server/harbor-guide";
import { AppError } from "@/server/http/errors";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  if (!isSiteGuideEnabled())
    throw new AppError("AI_UNAVAILABLE", "The harbor guide is disabled", 503);
  const user = await requirePrincipal();
  const input = guideRequestSchema.parse(await boundedJson(request, 24 * 1024));
  await enforceAccountRateLimit(user.id, "harbor-guide", 6, 60);
  try {
    return jsonData(await answerHarborGuide(input, request.signal), requestId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "AI_UNAVAILABLE",
      "The harbor guide could not complete the request",
      502,
    );
  }
});
