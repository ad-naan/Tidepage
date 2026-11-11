import { requirePrincipal } from "@/modules/identity/server";
import { diagramRequestSchema } from "@/modules/ai/domain/diagram";
import { generateDiagram } from "@/modules/ai/server/diagram";
import { isEditorialAgentConfigured } from "@/modules/ai/server";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { AppError } from "@/server/http/errors";

export const runtime = "nodejs";
export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const owner = await requirePrincipal(["author", "admin"]);
  const input = diagramRequestSchema.parse(
    await boundedJson(request, 96 * 1024),
  );
  if (!isEditorialAgentConfigured())
    throw new AppError(
      "AI_UNAVAILABLE",
      "The diagram provider is not configured",
      503,
    );
  await enforceAccountRateLimit(owner.id, "editorial-assistant", 12, 60);
  try {
    const diagram = await generateDiagram(
      { audience: "editorial", accountId: owner.id },
      input,
      request.signal,
    );
    return jsonData(diagram, requestId);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "AI_UNAVAILABLE",
      "The diagram provider could not complete the request",
      502,
    );
  }
});
