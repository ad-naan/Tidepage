import { isEditorialAgentConfigured } from "@/modules/ai/server";
import { requirePrincipal } from "@/modules/identity/server";
import { publicationRequestSchema } from "@/modules/content/domain/publication";
import { reviewArticlePublication } from "@/modules/content/server/publication-review";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { AppError } from "@/server/http/errors";

export const runtime = "nodejs";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const owner = await requirePrincipal(["author", "admin"]);
  const input = publicationRequestSchema.parse(
    await boundedJson(request, 2048),
  );
  if (!isEditorialAgentConfigured())
    throw new AppError(
      "AI_UNAVAILABLE",
      "The model provider is not configured",
      503,
    );
  await enforceAccountRateLimit(owner.id, "article-publication-review", 6, 60);
  try {
    return jsonData(
      await reviewArticlePublication(owner.id, input, request.signal),
      requestId,
    );
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "AI_UNAVAILABLE",
      "The publication review could not be completed",
      502,
    );
  }
});
