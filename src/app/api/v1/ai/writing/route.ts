import { requirePrincipal } from "@/modules/identity/server";
import {
  writingRequestSchema,
  type WritingEvent,
} from "@/modules/ai/domain/writing";
import {
  generateEditorialSuggestion,
  generateEditorialText,
  isEditorialAgentConfigured,
} from "@/modules/ai/server";
import { AppError } from "@/server/http/errors";
import { requireSameOrigin } from "@/server/http/origin";
import { boundedJson } from "@/server/http/body";
import { enforceAccountRateLimit } from "@/server/http/rate-limit";
import { defineRoute, jsonData } from "@/server/http/route";
import { log } from "@/server/observability/logger";

export const runtime = "nodejs";

export const POST = defineRoute(async (request, { requestId }) => {
  requireSameOrigin(request);
  const owner = await requirePrincipal(["author", "admin"]);
  const input = writingRequestSchema.parse(
    await boundedJson(request, 512 * 1024),
  );
  if (!isEditorialAgentConfigured())
    throw new AppError(
      "AI_UNAVAILABLE",
      "The writing provider is not configured",
      503,
    );
  await enforceAccountRateLimit(owner.id, "editorial-assistant", 12, 60);
  const access = { audience: "editorial", accountId: owner.id } as const;
  try {
    if (input.task !== "write")
      return jsonData(
        await generateEditorialSuggestion(access, input, request.signal),
        requestId,
      );
    const encoder = new TextEncoder();
    const encode = (event: WritingEvent) =>
      encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
    const generation = new AbortController();
    const signal = AbortSignal.any([request.signal, generation.signal]);
    const iterator = generateEditorialText(access, input, signal);
    const first = await iterator.next();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        if (!first.done)
          controller.enqueue(encode({ type: "delta", text: first.value }));
      },
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (!next.done)
            controller.enqueue(encode({ type: "delta", text: next.value }));
          else {
            controller.enqueue(encode({ type: "done" }));
            controller.close();
          }
        } catch {
          log("warn", "ai.stream_interrupted", { requestId, component: "ai" });
          controller.close();
        }
      },
      async cancel() {
        generation.abort();
        await iterator.return(undefined);
      },
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "AI_UNAVAILABLE",
      "The writing provider could not complete the request",
      502,
    );
  }
});
