import assert from "node:assert/strict";
import { test } from "node:test";
import { articleFixtures, createContentTestStore } from "../fixtures/content";
import { articlesTable } from "../../src/modules/content/infrastructure/schema";
import { legacyArticlesToDraft } from "../../src/modules/content/domain/legacy-draft";
import { reviewArticlePublication } from "../../src/modules/content/server/publication-review";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { mcpReferenceTool } from "../../src/modules/ai/server/mcp";
import { workbenchRecords } from "../../src/server/workbench/records";
import type { Database } from "../../src/server/db/client";

function toolCall(name: string, args: object = {}) {
  return {
    id: name,
    type: "function",
    function: { name, arguments: JSON.stringify(args) },
  };
}

test("publication review reads the saved revision and returns verified evidence without writing", async (t) => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.AI_CHAT_COMPLETIONS_URL =
    "http://127.0.0.1:9000/v1/chat/completions";
  process.env.AI_MODEL = "test-tool-model";
  process.env.SITE_URL = "https://example.test";
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [{ id: owner }, { id: otherOwner }] = await fixture.db
    .insert(usersTable)
    .values([{ displayName: "Owner" }, { displayName: "Other owner" }])
    .returning();
  const article = articleFixtures[1];
  await fixture.db.insert(articlesTable).values({
    ...article,
    visibility: "published",
    publishedAt: new Date(article.date),
    updatedAt: new Date(article.updatedAt),
  });
  const draft = legacyArticlesToDraft([article]);
  draft.id = "review-draft";
  draft.revision = 2;
  draft.publishedAt = "2099-01-01T12:30";
  draft.translations.en.slug = "future-article";
  draft.translations.en.seoTitle = "";
  draft.translations.en.seoDescription = "";
  const records = workbenchRecords(db);
  await records.write(owner, "articles", 0, [draft]);
  const saved = await records.read(owner, "articles");
  const request = { id: draft.id, locale: "en", revision: 2 } as const;
  const suggestion = (evidence: string[]) => ({
    summary: "Review the overlap and scheduled publication.",
    suggestions: [
      {
        priority: "medium",
        observation: "A related article exists and this draft is scheduled.",
        recommendation: "Differentiate the title and verify the date.",
        evidence,
      },
    ],
  });
  const mock = t.mock.method(
    globalThis,
    "fetch",
    async (url: string, init: RequestInit) => {
      assert.equal(url, process.env.AI_CHAT_COMPLETIONS_URL);
      const input = JSON.parse(String(init.body));
      assert.equal(input.stream, false);
      assert.deepEqual(
        input.tools.map(
          (tool: { function: { name: string } }) => tool.function.name,
        ),
        ["read_draft", "search_articles", "check_seo", "preview_rss"],
      );
      const stop = (content: unknown) =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify(content) },
            },
          ],
        });
      const call = (...tool_calls: ReturnType<typeof toolCall>[]) =>
        Response.json({
          choices: [
            {
              finish_reason: "tool_calls",
              message: { content: null, tool_calls },
            },
          ],
        });
      const messages = input.messages as {
        role: string;
        content: string;
        tool_call_id?: string;
      }[];
      const tools = messages.filter(({ role }) => role === "tool");
      if (!tools.length)
        return messages.length === 2
          ? stop(suggestion(["E1"]))
          : call(toolCall("read_draft"));
      assert.match(tools[0].content, /Test paragraph/);
      if (tools.length === 1)
        return call(
          toolCall("search_articles", { query: "AI fixture" }),
          toolCall("check_seo"),
          toolCall("preview_rss"),
        );
      assert.match(tools[1].content, /fixture-article/);
      assert.match(tools[2].content, /AI fixture \(en\)/);
      const rss = JSON.parse(tools[3].content);
      assert.equal(rss.context.status, "scheduled");
      assert.equal(
        rss.context.item.url,
        "https://example.test/en/articles/future-article",
      );
      assert.equal(rss.context.item.description, "Test excerpt");
      return stop(
        suggestion(messages.at(-1)?.role === "tool" ? ["E99"] : ["E2", "E4"]),
      );
    },
  );

  const review = await reviewArticlePublication(
    owner,
    request,
    new AbortController().signal,
    db,
  );
  assert.equal(mock.mock.callCount(), 5);
  assert.equal(review.revision, 2);
  assert.deepEqual(
    review.evidence.map(({ id, tool }) => [id, tool]),
    [
      ["E1", "read_draft"],
      ["E2", "search_articles"],
      ["E3", "check_seo"],
      ["E4", "preview_rss"],
    ],
  );
  assert.deepEqual(review.report.suggestions[0].evidence, ["E2", "E4"]);
  assert.equal(
    await fixture.service.articleBySlug("future-article", "en"),
    null,
  );
  assert.deepEqual(await records.read(owner, "articles"), saved);
  await assert.rejects(
    reviewArticlePublication(
      owner,
      { ...request, revision: 1 },
      new AbortController().signal,
      db,
    ),
    { status: 409 },
  );
  await assert.rejects(
    reviewArticlePublication(
      otherOwner,
      request,
      new AbortController().signal,
      db,
    ),
    { status: 404 },
  );
});

test("the MCP adapter sends fixed arguments and calls only an advertised read-only tool", async (t) => {
  const endpoint = "https://editorial.example.test/mcp";
  const methods: string[] = [];
  let readOnly = true;
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    assert.equal(url, endpoint);
    const headers = new Headers(init.headers);
    if (init.method === "DELETE") {
      assert.equal(headers.get("MCP-Session-Id"), "test-session");
      methods.push("DELETE");
      return new Response(null, { status: 204 });
    }
    const { id, method, params } = JSON.parse(String(init.body));
    const result = (value: object) => ({ jsonrpc: "2.0", id, result: value });
    methods.push(method);
    if (method === "initialize")
      return Response.json(
        result({ protocolVersion: "2025-11-25", capabilities: { tools: {} } }),
        {
          headers: { "MCP-Session-Id": "test-session" },
        },
      );
    assert.equal(headers.get("MCP-Protocol-Version"), "2025-11-25");
    assert.equal(headers.get("MCP-Session-Id"), "test-session");
    if (method === "notifications/initialized") {
      assert.equal(id, undefined);
      return new Response(null, { status: 202 });
    }
    if (method === "tools/list")
      return Response.json(
        result({
          tools: [
            { name: "guidance", annotations: { readOnlyHint: readOnly } },
          ],
        }),
      );
    assert.equal(method, "tools/call");
    assert.deepEqual(params, { name: "guidance", arguments: { locale: "en" } });
    return new Response(
      `data: ${JSON.stringify(result({ content: [{ type: "text", text: "Check the date." }] }))}\n\n`,
      {
        headers: { "Content-Type": "text/event-stream" },
      },
    );
  });
  const tool = mcpReferenceTool({
    endpoint,
    remoteName: "guidance",
    arguments: { locale: "en" },
    label: "Editorial guidance",
  });
  const signal = new AbortController().signal;
  assert.deepEqual(await tool.invoke({}, signal), {
    source: {
      facts: [{ label: "Editorial guidance", value: "Check the date." }],
    },
  });
  assert.deepEqual(methods.splice(0), [
    "initialize",
    "notifications/initialized",
    "tools/list",
    "tools/call",
    "DELETE",
  ]);
  readOnly = false;
  assert.ok("error" in (await tool.invoke({}, signal)));
  assert.deepEqual(methods, [
    "initialize",
    "notifications/initialized",
    "tools/list",
    "DELETE",
  ]);
});
