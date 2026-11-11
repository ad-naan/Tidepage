import { readEventStream } from "@/shared/http/event-stream";
import {
  diagramEventSchema,
  type DiagramRequest,
  type DiagramEvent,
} from "@/modules/ai/domain/diagram";

export async function* streamDiagram(
  input: DiagramRequest,
  signal: AbortSignal,
): AsyncGenerator<DiagramEvent> {
  const response = await fetch("/api/v1/ai/diagram", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(input),
    signal: AbortSignal.any([signal, AbortSignal.timeout(65000)]),
  });
  if (!response.ok || !response.body) throw new Error("DIAGRAM_UNAVAILABLE");
  for await (const frame of readEventStream(response.body, signal)) {
    const event = diagramEventSchema.parse(JSON.parse(frame));
    if (event.type === "error") throw new Error("DIAGRAM_STREAM_FAILED");
    yield event;
    if (event.type === "done") return;
  }
  throw new Error("DIAGRAM_STREAM_INTERRUPTED");
}
