import { companionConversationSchema } from "@/modules/world/domain/companion-conversation";
import { answerCompanionConversation } from "@/modules/world/server/companion-conversation";
import { requireHarborAiAccess } from "@/modules/world/server/harbor-ai-access";
import { AppError } from "@/server/http/errors";
import { boundedJson } from "@/server/http/body";
import { defineRoute, jsonData } from "@/server/http/route";

export const POST = defineRoute(async (request, { requestId }) => {
  const access = await requireHarborAiAccess(request);
  const input = companionConversationSchema.parse(
    await boundedJson(request, 8 * 1024),
  );
  try {
    return jsonData(
      await answerCompanionConversation(access, input, request.signal),
      requestId,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AI_UNAVAILABLE", "Companions could not answer", 502);
  }
});
