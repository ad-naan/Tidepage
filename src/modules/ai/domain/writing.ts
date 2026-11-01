export type WritingRequest = {
  prompt: string;
  locale: string;
  context: string;
  selection: string;
};
export type WritingEvent = { type: "delta"; text: string } | { type: "done" };
export interface WritingAgent {
  stream(
    input: WritingRequest,
    signal: AbortSignal,
  ): AsyncIterable<WritingEvent>;
}
