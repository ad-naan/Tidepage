import { test } from "node:test";
import assert from "node:assert/strict";
import { generateEditorialSuggestion } from "../../src/modules/ai/server";
import { writingRequestSchema } from "../../src/modules/ai/domain/writing";
import { guideAnswerSchema } from "../../src/modules/world/domain/harbor-guide";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";

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
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const access = {
    audience: "editorial",
    accountId: "author",
    db: fixture.db as unknown as Database,
  } as const;
  let translated = ["标题", "正文"];
  let finish = "stop";
  const batches: string[][] = [];
  let respond = (_segments: string[]) => translated;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, process.env.AI_CHAT_COMPLETIONS_URL);
    const input = JSON.parse(String(init.body));
    assert.equal(input.model, process.env.AI_MODEL);
    assert.equal(input.stream, true);
    const { segments } = JSON.parse(input.messages[1].content);
    batches.push(segments);
    const frame = (choices: unknown[]) =>
      `data: ${JSON.stringify({ choices })}\n\n`;
    return new Response(
      frame([{ delta: { content: JSON.stringify(respond(segments)) } }]) +
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
    await generateEditorialSuggestion(
      access,
      input,
      new AbortController().signal,
    ),
    translated,
  );
  translated = ["标题"];
  await assert.rejects(
    generateEditorialSuggestion(access, input, new AbortController().signal),
  );
  finish = "length";
  await assert.rejects(
    generateEditorialSuggestion(access, input, new AbortController().signal),
    /incomplete/,
  );
  finish = "stop";
  batches.length = 0;
  respond = (segments) =>
    segments.map((segment) => segment.replaceAll("字", "文"));
  const long = "字。".repeat(8_100);
  const short = Array.from({ length: 260 }, (_, index) => `字${index}`);
  const large = writingRequestSchema.parse({
    ...input,
    segments: [...short, long],
  });
  assert.equal(large.task, "translate");
  assert.deepEqual(
    await generateEditorialSuggestion(
      access,
      large,
      new AbortController().signal,
    ),
    [
      ...short.map((segment) => segment.replace("字", "文")),
      long.replaceAll("字", "文"),
    ],
  );
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flat().slice(0, short.length), short);
  assert.equal(batches.flat().slice(short.length).join(""), long);
  assert.ok(
    batches.every(
      (batch) => batch.length <= 48 && batch.join("").length <= 3_200,
    ),
  );
  let call = 0;
  respond = (segments) => (++call === 2 ? [] : segments);
  await assert.rejects(
    generateEditorialSuggestion(access, large, new AbortController().signal),
  );
});
