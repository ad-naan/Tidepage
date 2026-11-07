import type { WritingAgent } from "@/modules/ai/domain/writing";
import { readEventStream } from "@/shared/http/event-stream";
/** Credentials remain behind the authenticated same-origin server endpoint. */
export function createHttpWritingAgent(endpoint: string): WritingAgent {
  if (!/^\/(?!\/)/.test(endpoint))
    throw new Error("SAME_ORIGIN_ENDPOINT_REQUIRED");
  return {
    async *stream(input, signal) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ task: "write", ...input }),
        signal,
        credentials: "same-origin",
      });
      if (!response.ok || !response.body) throw new Error("AGENT_UNAVAILABLE");
      let complete = false;
      for await (const data of readEventStream(response.body, signal)) {
        const event = JSON.parse(data);
        if (event.type === "delta" && typeof event.text === "string")
          yield { type: "delta", text: event.text };
        else if (event.type === "done") {
          complete = true;
          yield { type: "done" };
          break;
        } else throw new Error("INVALID_AGENT_EVENT");
      }
      if (!complete) throw new Error("AGENT_STREAM_INTERRUPTED");
    },
  };
}
