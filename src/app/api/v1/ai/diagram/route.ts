import { requirePrincipal } from "@/modules/identity/server";
import { diagramRequestSchema } from "@/modules/ai/domain/diagram";
import { generateDiagram, streamDiagram } from "@/modules/ai/server/diagram";
import type { DiagramEvent } from "@/modules/ai/domain/diagram";
import { log } from "@/server/observability/logger";
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
  if (request.headers.get("accept")?.includes("text/event-stream")) {
    const generation = new AbortController();
    const signal = AbortSignal.any([request.signal, generation.signal]);
    const iterator = streamDiagram(
      { audience: "editorial", accountId: owner.id },
      input,
      signal,
    );
    const encoder = new TextEncoder();
    const encode = (event: DiagramEvent) =>
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    return new Response(
      new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await iterator.next();
            if (next.done) controller.close();
            else controller.enqueue(encode(next.value));
          } catch {
            log("warn", "ai.diagram_interrupted", {
              requestId,
              component: "ai",
            });
            controller.enqueue(encode({ type: "error" }));
            controller.close();
          }
        },
        async cancel() {
          generation.abort();
          await iterator.return(undefined);
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Accel-Buffering": "no",
        },
      },
    );
  }
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
