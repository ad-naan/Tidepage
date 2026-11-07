import { test } from "node:test";
import assert from "node:assert/strict";
import { generateEditorialSuggestion } from "../../src/modules/ai/server";
import { writingRequestSchema } from "../../src/modules/ai/domain/writing";
import { guideAnswerSchema } from "../../src/modules/world/domain/harbor-guide";

test("the harbor guide accepts registered destinations and link indices only", () => {
  const answer = { reply: "Try the dock.", destination: "dock", links: [0] };
  assert.equal(guideAnswerSchema.safeParse(answer).success, true);
  assert.equal(
    guideAnswerSchema.safeParse({ ...answer, destination: "outside" }).success,
    false,
  );
  assert.equal(
    guideAnswerSchema.safeParse({ ...answer, links: ["https://example.test"] })
      .success,
    false,
  );
});

test("editorial generation accepts only complete structured provider output", async (t) => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.AI_CHAT_COMPLETIONS_URL =
    "http://127.0.0.1:9000/v1/chat/completions";
  process.env.AI_MODEL = "test-editorial-model";
  let translated = ["标题", "正文"];
  let finish = "stop";
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, process.env.AI_CHAT_COMPLETIONS_URL);
    const input = JSON.parse(String(init.body));
    assert.equal(input.model, process.env.AI_MODEL);
    assert.equal(input.stream, true);
    const frame = (choices: unknown[]) =>
      `data: ${JSON.stringify({ choices })}\n\n`;
    return new Response(
      frame([{ delta: { content: JSON.stringify(translated) } }]) +
        frame([{ finish_reason: finish }]) +
        "data: [DONE]\n\n",
    );
  });
  const request = {
    task: "translate",
    locale: "zh-CN",
    sourceLocale: "en",
    segments: ["Title", "Body"],
  } as const;
  const input = { ...request, segments: [...request.segments] };
  assert.equal(writingRequestSchema.safeParse(input).success, true);
  assert.deepEqual(
    await generateEditorialSuggestion(input, new AbortController().signal),
    translated,
  );
  translated = ["标题"];
  await assert.rejects(
    generateEditorialSuggestion(input, new AbortController().signal),
  );
  finish = "length";
  await assert.rejects(
    generateEditorialSuggestion(input, new AbortController().signal),
    /incomplete/,
  );
});
