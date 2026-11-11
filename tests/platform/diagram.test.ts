import { test } from "node:test";
import assert from "node:assert/strict";
import {
  diagramSchema,
  type MiniDiagram,
} from "../../src/shared/contracts/diagram";
import {
  layoutDiagram,
  diagramLines,
} from "../../src/shared/lib/diagram-layout";
import {
  documentText,
  isEditorDocument,
} from "../../src/shared/contracts/rich-text";
import { newArticle } from "../../src/modules/content/domain/editor-document";
import { documentMarkdown } from "../../src/modules/content/domain/document-presentation";
import {
  translationSegments,
  applyTranslationSegments,
} from "../../src/modules/content/domain/translation";
import { commentDocumentSchema } from "../../src/modules/engagement/domain/comment-document";
import { diagramRequestSchema } from "../../src/modules/ai/domain/diagram";
import {
  generateDiagram,
  streamDiagram,
} from "../../src/modules/ai/server/diagram";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { workbenchRecords } from "../../src/server/workbench/records";
import { publishArticle } from "../../src/modules/content/server/publish-article";
import {
  diagramNodeStrokes,
  diagramLineStrokes,
} from "../../src/shared/lib/diagram-strokes";

const diagram: MiniDiagram = {
  version: 1,
  title: "Article workflow",
  caption: "From an idea to a published article.",
  direction: "vertical",
  nodes: [
    { id: "idea", label: "Gather ideas", shape: "pill", tone: "ink" },
    { id: "review", label: "Review the draft", shape: "decision", tone: "sea" },
    { id: "publish", label: "Publish", shape: "box", tone: "warm" },
    { id: "revise", label: "Revise", shape: "box", tone: "ink" },
  ],
  edges: [
    { from: "idea", to: "review", label: "" },
    { from: "review", to: "publish", label: "Ready" },
    { from: "review", to: "revise", label: "Needs work" },
  ],
};

test("diagram contracts reject broken references, duplicate IDs, unsafe extensions and oversized graphs", () => {
  assert.equal(diagramSchema.safeParse(diagram).success, true);
  for (const bad of [
    { ...diagram, nodes: [...diagram.nodes, diagram.nodes[0]] },
    { ...diagram, edges: [{ from: "idea", to: "missing", label: "" }] },
    { ...diagram, edges: [{ from: "idea", to: "idea", label: "" }] },
    { ...diagram, edges: [...diagram.edges, diagram.edges[0]] },
    {
      ...diagram,
      nodes: Array.from({ length: 13 }, (_, i) => ({
        ...diagram.nodes[0],
        id: `n${i}`,
      })),
    },
    { ...diagram, script: "alert(1)" },
  ])
    assert.equal(diagramSchema.safeParse(bad).success, false);
  assert.equal(
    diagramRequestSchema.safeParse({
      locale: "en",
      prompt: "draw",
      context: "",
      diagram,
    }).success,
    true,
  );
});

test("layout preserves branch order, keeps nodes apart and puts cycles in bounded outside lanes", () => {
  for (const direction of ["vertical", "horizontal"] as const) {
    for (const graph of [
      diagram,
      {
        ...diagram,
        edges: [
          ...diagram.edges,
          { from: "revise", to: "idea", label: "Again" },
        ],
      },
    ]) {
      const value = { ...graph, direction };
      const layout = layoutDiagram(value);
      assert.deepEqual(layout, layoutDiagram(value));
      for (const node of layout.nodes) {
        assert.ok(node.x >= 0 && node.y >= 0);
        assert.ok(node.x + node.width < layout.width);
        assert.ok(node.y + node.height < layout.height);
        for (const other of layout.nodes.filter((item) => item.id !== node.id))
          assert.ok(
            node.x + node.width <= other.x ||
              other.x + other.width <= node.x ||
              node.y + node.height <= other.y ||
              other.y + other.height <= node.y,
          );
      }
      for (const edge of layout.edges)
        assert.doesNotMatch(edge.path + edge.arrow, /NaN|undefined|Infinity/);
    }
  }
  const text = "手绘图表与 Mixed text 🐚 ".repeat(3);
  assert.equal(diagramLines(text).join(""), text);
});

test("hand-drawn paths retain their seeds across rendering and use independent strokes and hatching", () => {
  const layout = layoutDiagram(diagram);
  const node = layout.nodes[0];
  const first = diagramNodeStrokes(node, "#30332f");
  assert.deepEqual(first, diagramNodeStrokes(node, "#30332f"));
  assert.notDeepEqual(
    first,
    diagramNodeStrokes({ ...node, id: "different" }, "#30332f"),
  );
  assert.ok((first[0].d.match(/M/g) ?? []).length >= 2);
  const shaded = diagramNodeStrokes(layout.nodes[1], "#557d79");
  assert.ok(shaded.some((path) => path.opacity < 1));
  const edge = layout.edges[0];
  const lines = diagramLineStrokes(edge.path, "edge");
  assert.deepEqual(lines, diagramLineStrokes(edge.path, "edge"));
  assert.notEqual(lines[0].d, edge.path);
});

test("compact layouts size labels independently and give branches separate ports", () => {
  const value: MiniDiagram = {
    ...diagram,
    nodes: diagram.nodes.map((node) => ({ ...node })),
  };
  value.nodes[2].label = "Go";
  value.nodes[3].label = "Revise the introduction";
  for (const direction of ["vertical", "horizontal"] as const) {
    const layout = layoutDiagram({ ...value, direction });
    const decision = layout.nodes.find((node) => node.id === "review")!;
    const short = layout.nodes.find((node) => node.id === "publish")!;
    const longer = layout.nodes.find((node) => node.id === "revise")!;
    assert.ok(decision.height >= 100);
    assert.ok(short.width < longer.width);
    const branches = layout.edges.filter((edge) => edge.from === "review");
    assert.notEqual(
      branches[0].path.split(" C")[0],
      branches[1].path.split(" C")[0],
    );
    for (const edge of branches) {
      const target = layout.nodes.find((node) => node.id === edge.to)!;
      const endpoint = edge.path.match(/,([\d.]+) ([\d.]+)$/)!;
      if (direction === "vertical")
        assert.ok(Math.abs(Number(endpoint[2]) - (target.y - 8)) < 1e-8);
      else assert.ok(Math.abs(Number(endpoint[1]) - (target.x - 8)) < 1e-8);
    }
  }
});

test("diagrams survive document serialization and translate labels without changing connections", () => {
  const article = newArticle("diagram").translations.en;
  article.body = {
    type: "doc",
    content: [{ type: "miniDiagram", attrs: { diagram } }],
  };
  const stored = JSON.parse(JSON.stringify(article));
  assert.equal(isEditorDocument(stored.body), true);
  assert.equal(commentDocumentSchema.safeParse(stored.body).success, false);
  assert.match(
    documentText(stored.body),
    /Review the draft → Publish \(Ready\)/,
  );
  assert.match(
    documentMarkdown(stored.body),
    /Gather ideas → Review the draft/,
  );
  const segments = translationSegments(stored);
  assert.ok(segments.includes("Gather ideas") && segments.includes("Ready"));
  const translated = applyTranslationSegments(
    stored,
    segments.map((value) => `译${value}`),
  );
  assert.equal(isEditorDocument(translated.body), true);
  const result = diagramSchema.parse(
    translated.body.content![0].attrs!.diagram,
  );
  assert.equal(result.nodes[0].label, "译Gather ideas");
  assert.deepEqual(
    result.edges.map(({ from, to }) => [from, to]),
    diagram.edges.map(({ from, to }) => [from, to]),
  );
  const bad = structuredClone(stored.body);
  bad.content[0].attrs.diagram.edges[0].to = "missing";
  assert.equal(isEditorDocument(bad), false);
});

test("diagram sources survive draft storage and publication independently of later edits", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [{ id: ownerId }] = await fixture.db
    .insert(usersTable)
    .values({ displayName: "Diagram author" })
    .returning();
  const draft = newArticle("diagram-draft");
  draft.revision = 1;
  draft.translations.en = {
    ...draft.translations.en,
    title: diagram.title,
    slug: "diagram-article",
    body: {
      type: "doc",
      content: [{ type: "miniDiagram", attrs: { diagram } }],
    },
  };
  const records = workbenchRecords(db);
  await records.write(ownerId, "articles", 0, [draft]);
  const saved = await records.read(ownerId, "articles");
  assert.deepEqual(
    saved.value?.[0].translations.en.body,
    draft.translations.en.body,
  );
  await publishArticle(
    ownerId,
    { id: draft.id, locale: "en", revision: 1 },
    db,
  );
  assert.deepEqual(
    (await fixture.service.articleBySlug("diagram-article", "en"))?.body,
    draft.translations.en.body,
  );
  draft.revision = 2;
  draft.translations.en.body.content![0].attrs = {
    diagram: { ...diagram, title: "Changed in draft" },
  };
  await records.write(ownerId, "articles", 1, [draft]);
  const published = await fixture.service.articleBySlug(
    "diagram-article",
    "en",
  );
  assert.equal(
    (published?.body?.content?.[0].attrs?.diagram as MiniDiagram).title,
    diagram.title,
  );
  await assert.rejects(records.write(ownerId, "articles", 1, [draft]), {
    status: 409,
  });
});

test("AI diagrams use the editorial provider and reject malformed or incomplete responses", async (t) => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  process.env.AI_CHAT_COMPLETIONS_URL =
    "http://127.0.0.1:9000/v1/chat/completions";
  process.env.AI_MODEL = "diagram-test";
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const access = {
    audience: "editorial",
    accountId: "author",
    db: fixture.db as unknown as Database,
  } as const;
  let result: unknown = diagram;
  let finish = "stop";
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) => {
      const payload = JSON.parse(String(init.body));
      assert.equal(payload.model, "diagram-test");
      assert.deepEqual(
        JSON.parse(payload.messages[1].content).diagram,
        diagram,
      );
      const chunks = JSON.stringify(result).match(/[\s\S]{1,25}/g)!;
      return new Response(
        chunks
          .map(
            (content) =>
              `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`,
          )
          .join("") +
          `data: ${JSON.stringify({ choices: [{ finish_reason: finish }] })}\n\ndata: [DONE]\n\n`,
      );
    },
  );
  const input = {
    locale: "en",
    prompt: "Simplify this flow",
    context: "Article selection",
    diagram,
  } as const;
  assert.deepEqual(
    await generateDiagram(access, input, new AbortController().signal),
    diagram,
  );
  const events = await Array.fromAsync(
    streamDiagram(access, input, new AbortController().signal),
  );
  assert.equal(events[0].type, "status");
  assert.deepEqual(events.at(-1), { type: "done", diagram });
  assert.ok(
    events.some(
      (event) =>
        event.type === "progress" &&
        event.diagram.nodes.length < diagram.nodes.length,
    ),
  );
  result = { ...diagram, edges: [{ from: "idea", to: "unknown", label: "" }] };
  await assert.rejects(
    generateDiagram(access, input, new AbortController().signal),
  );
  await assert.rejects(
    Array.fromAsync(streamDiagram(access, input, new AbortController().signal)),
  );
  result = diagram;
  finish = "length";
  await assert.rejects(
    generateDiagram(access, input, new AbortController().signal),
    /incomplete/,
  );
  await assert.rejects(
    Array.fromAsync(streamDiagram(access, input, new AbortController().signal)),
    /incomplete/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(generateDiagram(access, input, controller.signal));
});
