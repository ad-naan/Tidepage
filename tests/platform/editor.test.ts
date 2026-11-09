import { test } from "node:test";
import assert from "node:assert/strict";
import {
  articleDraftSchema,
  emptyDocument,
  isEditorDocument,
  newArticle,
  publicationIssues,
  safeWebUrl,
} from "../../src/modules/content/domain/editor-document";
import { legacyArticlesToDraft } from "../../src/modules/content/domain/legacy-draft";
import type { Article } from "../../src/modules/content/domain/models";
import { readEventStream } from "../../src/shared/http/event-stream";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { editCurrentBlock } from "../../src/modules/content/ui/admin/editor/document-blocks";
import {
  translationSegments,
  applyTranslationSegments,
} from "../../src/modules/content/domain/translation";

test("moving a block preserves the selection and undoes as one operation", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "text*" },
      text: {},
    },
  });
  const paragraph = (value: string) =>
    schema.node("paragraph", null, schema.text(value));
  const doc = schema.node("doc", null, [
    paragraph("First"),
    paragraph("Second"),
  ]);
  const before = EditorState.create({
    doc,
    selection: TextSelection.create(doc, 2, 4),
    plugins: [history()],
  });
  const moved = before.apply(editCurrentBlock(before, "down")!);
  assert.equal(moved.doc.textContent, "SecondFirst");
  assert.equal(
    moved.doc.textBetween(moved.selection.from, moved.selection.to),
    "ir",
  );
  assert.equal(
    undo(moved, (tr) => assert.equal(tr.doc.eq(doc), true)),
    true,
  );
  const across = before.apply(
    before.tr.setSelection(TextSelection.create(doc, 2, 9)),
  );
  assert.equal(editCurrentBlock(across, "remove"), null);
  assert.equal(
    before.apply(editCurrentBlock(before, "duplicate")!).doc.textContent,
    "FirstFirstSecond",
  );
});

test("translation changes text while retaining links, code and media references", () => {
  const value = newArticle("fixture").translations.en;
  value.title = "Title";
  value.slug = "fixture";
  value.body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Read",
            marks: [{ type: "link", attrs: { href: "https://example.test" } }],
          },
        ],
      },
      { type: "codeBlock", content: [{ type: "text", text: "const x = 42;" }] },
      {
        type: "assetImage",
        attrs: {
          assetId: "/uploads/fixture.png",
          alt: "Image",
          caption: "Coast",
          width: 50,
        },
      },
    ],
  };
  assert.deepEqual(translationSegments(value), [
    "Title",
    "Read",
    "Image",
    "Coast",
  ]);
  const translated = applyTranslationSegments(value, [
    "标题",
    "阅读",
    "图像",
    "海岸",
  ]);
  assert.equal(translated.title, "标题");
  assert.equal(
    translated.body.content?.[0].content?.[0].marks?.[0].attrs?.href,
    "https://example.test",
  );
  assert.deepEqual(translated.body.content?.[1], value.body.content?.[1]);
  assert.deepEqual(translated.body.content?.[2].attrs, {
    assetId: "/uploads/fixture.png",
    alt: "图像",
    caption: "海岸",
    width: 50,
  });
  assert.throws(
    () => applyTranslationSegments(value, ["标题"]),
    /SEGMENT_MISMATCH/,
  );
});

test("content translations keep separate titles, documents, tags and SEO without falling back", () => {
  const draft = newArticle("example");
  draft.translations["zh-CN"].title = "中文标题";
  draft.translations["zh-CN"].seoTitle = "中文搜索标题";
  draft.translations.en.title = "English";
  assert.equal(draft.translations.en.seoTitle, "");
  assert.notEqual(draft.translations.en.body, draft.translations["zh-CN"].body);
  assert.equal(
    articleDraftSchema.parse(draft).translations["zh-CN"].title,
    "中文标题",
  );
  assert.ok(publicationIssues(draft, "en").includes("slug"));
});
test("editor storage rejects unknown content, unsafe links and excessive nesting without exceptions", () => {
  for (const url of [
    "bad url",
    "javascript:alert(1)",
    "https://user:secret@example.com",
  ])
    assert.equal(safeWebUrl.safeParse(url).success, false);
  assert.equal(isEditorDocument(emptyDocument()), true);
  assert.equal(
    isEditorDocument({
      type: "doc",
      content: [{ type: "unregistered-widget" }],
    }),
    false,
  );
  assert.equal(
    isEditorDocument({
      type: "doc",
      content: [
        {
          type: "text",
          text: "bad",
          marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
        },
      ],
    }),
    false,
  );
  let nested: unknown = { type: "paragraph" };
  for (let i = 0; i < 40; i++)
    nested = { type: "blockquote", content: [nested] };
  assert.equal(isEditorDocument({ type: "doc", content: [nested] }), false);
});
test("legacy working copies preserve film artwork, original title, web metadata, callouts and code captions", () => {
  const article: Article = {
    locale: "zh-CN",
    slug: "example",
    title: "Title",
    excerpt: "Summary",
    date: "2026-11-01",
    updatedAt: "2026-11-01T00:00:00.000Z",
    category: "technology",
    minutes: 4,
    sketch: "boat",
    tags: ["tag"],
    sections: [
      {
        title: "Chapter",
        paragraphs: ["First paragraph"],
        blocks: [
          {
            type: "movie",
            url: "https://example.com/film",
            title: "Film",
            originalTitle: "Original",
            year: 2026,
            director: "Director",
            note: "A note",
            artwork: "/images/poster.png",
            artworkAlt: "Poster",
          },
          {
            type: "link",
            url: "https://example.com",
            title: "Website",
            description: "A site",
            siteName: "Example",
            image: "/images/site.png",
            imageAlt: "Site artwork",
          },
          { type: "callout", title: "Remember", text: "A detail", tone: "tip" },
          {
            type: "code",
            language: "ts",
            code: "const x = 1",
            caption: "An example",
          },
        ],
      },
    ],
  };
  const draft = legacyArticlesToDraft([article]);
  assert.equal(articleDraftSchema.safeParse(draft).success, true);
  const nodes = draft.translations["zh-CN"].body.content!;
  assert.equal(nodes[2].attrs?.originalTitle, "Original");
  assert.equal(nodes[2].attrs?.artworkAlt, "Poster");
  assert.equal(nodes[3].attrs?.siteName, "Example");
  assert.equal(nodes[4].attrs?.tone, "tip");
  assert.equal(nodes[5].attrs?.caption, "An example");
  assert.equal(draft.translations.en.title, "");
});
test("SSE decoder handles byte-fragmented UTF-8, split CRLF and multiline data", async () => {
  const bytes = new TextEncoder().encode(
    ': comment\r\ndata: {"type":"delta","text":"海风"}\r\n\r\ndata: line one\r\ndata: line two\r\n\r\ndata: {"type":"done"}\n\n',
  );
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      if (offset === bytes.length) c.close();
      else c.enqueue(bytes.slice(offset, ++offset));
    },
  });
  const frames = [];
  for await (const frame of readEventStream(body, new AbortController().signal))
    frames.push(frame);
  assert.deepEqual(frames, [
    '{"type":"delta","text":"海风"}',
    "line one\nline two",
    '{"type":"done"}',
  ]);
});
test("aborting an idle SSE read cancels the underlying stream", async () => {
  let cancelled = false;
  const controller = new AbortController();
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      cancelled = true;
    },
  });
  const iterator = readEventStream(body, controller.signal);
  const next = iterator.next();
  controller.abort();
  await assert.rejects(next);
  assert.equal(cancelled, true);
});
