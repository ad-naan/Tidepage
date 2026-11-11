import { test } from "node:test";
import assert from "node:assert/strict";
import { diagramProgress } from "../../src/modules/ai/domain/diagram-progress";
import { streamDiagram } from "../../src/modules/ai/ui/diagram-stream";
import {
  diagramSchema,
  type MiniDiagram,
} from "../../src/shared/contracts/diagram";
import {
  writingRequestSchema,
  articleContextLimit,
} from "../../src/modules/ai/domain/writing";

const diagram: MiniDiagram = {
  version: 1,
  title: '步骤与 "引号" 🐚',
  caption: "A compact diagram",
  direction: "vertical",
  nodes: [
    {
      id: "one",
      label: 'Text with } ] and "quotes"',
      shape: "pill",
      tone: "ink",
    },
    { id: "two", label: "完成", shape: "box", tone: "warm" },
  ],
  edges: [{ from: "one", to: "two", label: "继续" }],
};

test("partial diagram JSON exposes only complete valid nodes and connected edges", () => {
  const source = JSON.stringify(diagram);
  const counts = new Set<number>();
  for (let end = 1; end <= source.length; end++) {
    const preview = diagramProgress(source.slice(0, end));
    if (!preview) continue;
    assert.equal(diagramSchema.safeParse(preview).success, true);
    counts.add(preview.nodes.length);
    for (const node of preview.nodes)
      assert.deepEqual(
        node,
        diagram.nodes.find((item) => item.id === node.id),
      );
    for (const edge of preview.edges)
      assert.ok(
        preview.nodes.some((node) => node.id === edge.from) &&
          preview.nodes.some((node) => node.id === edge.to),
      );
  }
  assert.deepEqual([...counts], [1, 2]);
  assert.equal(
    diagramProgress('{"nodes":[{"id":"one","label":"unfinished'),
    null,
  );
  const bad = {
    ...diagram,
    edges: [{ from: "one", to: "unknown", label: "" }],
  };
  assert.deepEqual(diagramProgress(JSON.stringify(bad))?.edges, []);
  assert.equal(diagramSchema.safeParse(bad).success, false);
});

test("diagram event transport validates completion, fragmented UTF-8 and cancellation", async (t) => {
  let frames: unknown[] = [
    { type: "status", phase: "generating" },
    { type: "progress", diagram },
    { type: "done", diagram },
  ];
  let cancelled = false;
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      assert.equal(
        (init.headers as Record<string, string>).Accept,
        "text/event-stream",
      );
      assert.equal(init.credentials, "same-origin");
      const bytes = new TextEncoder().encode(
        frames
          .map((frame) => `data: ${JSON.stringify(frame)}\r\n\r\n`)
          .join(""),
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            for (let index = 0; index < bytes.length; index += 3)
              controller.enqueue(bytes.slice(index, index + 3));
          },
          cancel() {
            cancelled = true;
          },
        }),
      );
    },
  );
  const input = { locale: "zh-CN", prompt: "画图", context: "" } as const;
  const events = await Array.fromAsync(
    streamDiagram(input, new AbortController().signal),
  );
  assert.deepEqual(events, frames);
  assert.equal(cancelled, true);
  // EOF without a final, validated scene is an interruption, never success.
  frames = [{ type: "progress", diagram }];
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(
        frames.map((frame) => `data: ${JSON.stringify(frame)}\n\n`).join(""),
      ),
  );
  await assert.rejects(
    Array.fromAsync(streamDiagram(input, new AbortController().signal)),
    /INTERRUPTED/,
  );
  frames = [{ type: "done", diagram: { ...diagram, nodes: [] } }];
  await assert.rejects(
    Array.fromAsync(streamDiagram(input, new AbortController().signal)),
  );
  frames = [{ type: "error" }];
  await assert.rejects(
    Array.fromAsync(streamDiagram(input, new AbortController().signal)),
    /FAILED/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    Array.fromAsync(streamDiagram(input, controller.signal)),
  );
});

test("writing follow-ups accept a bounded draft with the registered content locale", () => {
  const request = {
    task: "write",
    locale: "en",
    prompt: "Shorten this draft",
    selection: "Source",
    context: "Article",
    draft: "Previous suggestion",
  };
  assert.equal(writingRequestSchema.safeParse(request).success, true);
  assert.equal(
    writingRequestSchema.safeParse({
      ...request,
      draft: "x".repeat(articleContextLimit + 1),
    }).success,
    false,
  );
  assert.equal(
    writingRequestSchema.safeParse({ ...request, locale: "unknown" }).success,
    false,
  );
});
