import { requirePrincipal } from "@/modules/identity/server";
import { isSiteGuideEnabled } from "@/modules/ai/server";
import { companionConversationSchema } from "@/modules/world/domain/companion-conversation";
import { answerCompanionConversation } from "@/modules/world/server/companion-conversation";
import { AppError } from "@/server/http/errors";
import { boundedJson } from "@/server/http/body";
import { requireSameOrigin } from "@/server/http/origin";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  if (!isSiteGuideEnabled())
    throw new AppError("AI_UNAVAILABLE", "Companions are disabled", 503);
  const user = await requirePrincipal();
  const input = companionConversationSchema.parse(
    await boundedJson(request, 8 * 1024),
  );
  await enforceAccountRateLimit(user.id, "harbor-companions", 12, 60);
  try {
    return jsonData(
      await answerCompanionConversation(input, request.signal),
      requestId,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AI_UNAVAILABLE", "Companions could not answer", 502);
  }
});
