import { guideRequestSchema } from "@/modules/world/domain/harbor-guide";
import { answerHarborGuide } from "@/modules/world/server/harbor-guide";
import { requireHarborAiAccess } from "@/modules/world/server/harbor-ai-access";
import { AppError } from "@/server/http/errors";
import { boundedJson } from "@/server/http/body";
import { defineRoute, jsonData } from "@/server/http/route";

export const POST = defineRoute(async (request, { requestId }) => {
  const access = await requireHarborAiAccess(request);
  const input = guideRequestSchema.parse(await boundedJson(request, 24 * 1024));
  try {
    return jsonData(
      await answerHarborGuide(access, input, request.signal),
      requestId,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "AI_UNAVAILABLE",
      "The harbor guide could not complete the request",
      502,
    );
  }
});
