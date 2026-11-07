import { test } from "node:test";
import assert from "node:assert/strict";
import {
  documentText,
  isEditorDocument,
  type EditorNode,
} from "../../src/shared/contracts/rich-text";
import { documentMarkdown } from "../../src/modules/content/domain/document-presentation";
import { newCommentSchema } from "../../src/modules/engagement/domain/discussion";
import { discussionStore } from "../../src/modules/engagement/server";
import { settingsDraftSchema } from "../../src/modules/site-settings/domain/models";
import {
  parsePageDocument,
  sectionsDocument,
} from "../../src/modules/site-settings/domain/pages";
import { createContentTestStore } from "../fixtures/content";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import type { Database } from "../../src/server/db/client";
import { stickers } from "../../src/shared/config/stickers";
import { access } from "node:fs/promises";

const paragraph: EditorNode = {
  type: "paragraph",
  content: [
    {
      type: "text",
      text: "A thought",
      marks: [{ type: "bold" }, { type: "highlight" }],
    },
    { type: "text", text: "2", marks: [{ type: "superscript" }] },
    {
      type: "text",
      text: "source",
      marks: [{ type: "link", attrs: { href: "https://example.com/path" } }],
    },
  ],
};
const document: EditorNode = {
  type: "doc",
  content: [
    paragraph,
    {
      type: "blockquote",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "A quote" }] },
      ],
    },
  ],
};

test("page documents preserve rich marks and collapsible blocks in storage and Markdown", () => {
  const rich: EditorNode = {
    type: "doc",
    content: [
      paragraph,
      {
        type: "details",
        attrs: { summary: "More <context>" },
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "H2O", marks: [{ type: "subscript" }] },
            ],
          },
        ],
      },
    ],
  };
  assert.equal(isEditorDocument(rich), true);
  const fields = {
    aboutBody: JSON.stringify(rich),
    siteAboutBody: JSON.stringify(rich),
  };
  const stored = settingsDraftSchema.parse({
    revision: 1,
    translations: { en: fields },
  });
  assert.deepEqual(
    parsePageDocument(stored.translations.en.aboutBody, []),
    rich,
  );
  const markdown = documentMarkdown(rich);
  for (const expected of [
    "<mark>",
    "<sup>2</sup>",
    "<sub>H2O</sub>",
    "<details>",
    "More &lt;context&gt;",
    "https://example.com/path",
  ])
    assert.ok(markdown.includes(expected), expected);
  const legacy = [{ title: "A section", paragraphs: ["A paragraph"] }];
  assert.deepEqual(
    parsePageDocument(undefined, legacy),
    sectionsDocument(legacy),
  );
  assert.throws(() =>
    settingsDraftSchema.parse({
      revision: 1,
      translations: { en: { aboutBody: '{"type":"script"}' } },
    }),
  );
});

test("comment profile derives its text from the document and rejects oversized, unsafe or unsupported blocks", () => {
  const input = {
    target: { type: "page", id: "about" },
    locale: "en",
    document,
    body: "Spoofed fallback",
  };
  assert.equal(
    newCommentSchema.parse(input).body,
    documentText(document).trim(),
  );
  for (const invalid of [
    { type: "doc", content: [{ type: "paragraph" }] },
    {
      type: "doc",
      content: [{ type: "assetImage", attrs: { assetId: "/uploads/a.png" } }],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "x".repeat(2001) }],
        },
      ],
    },
    {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Unsafe",
              marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
            },
          ],
        },
      ],
    },
  ])
    assert.equal(
      newCommentSchema.safeParse({ ...input, document: invalid }).success,
      false,
    );
});

test("rich comments round trip through PostgreSQL while existing plain comments remain unchanged", async () => {
  const fixture = await createContentTestStore();
  try {
    const [user] = await fixture.db
      .insert(usersTable)
      .values({ displayName: "Reader" })
      .returning();
    const store = discussionStore(fixture.db as unknown as Database);
    const target = { type: "page", id: "about" } as const;
    const old = await store.create(user.id, {
      target,
      locale: "en",
      body: "<b>Still plain text</b>",
    });
    assert.equal(old.document, null);
    const created = await store.create(user.id, {
      target,
      locale: "en",
      document,
    });
    assert.deepEqual(created.document, document);
    assert.equal(created.body, documentText(document).trim());
    const page = await store.list({ ...target, locale: "en" });
    assert.equal(page.items[0].body, "<b>Still plain text</b>");
    assert.deepEqual(page.items[1].document, document);
  } finally {
    await fixture.close();
  }
});

test("registered stickers support image-only comments, round trip and reject arbitrary sources", async () => {
  const document: EditorNode = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "sticker", attrs: { id: "fluent:otter" } }],
      },
    ],
  };
  assert.equal(isEditorDocument(document), true);
  const target = { type: "page", id: "about" } as const;
  assert.equal(
    newCommentSchema.safeParse({ target, locale: "en", document }).success,
    true,
  );
  assert.ok(
    documentMarkdown(document).includes("/assets/stickers/fluent/otter.webp"),
  );
  assert.equal(
    isEditorDocument({
      type: "doc",
      content: [
        { type: "sticker", attrs: { id: "https://example.com/tracker.png" } },
      ],
    }),
    false,
  );
  assert.equal(new Set(stickers.map((item) => item.id)).size, stickers.length);
  for (const sticker of stickers)
    await access(new URL(`../../public${sticker.src}`, import.meta.url));
  const fixture = await createContentTestStore();
  try {
    const [user] = await fixture.db
      .insert(usersTable)
      .values({ displayName: "Reader" })
      .returning();
    const store = discussionStore(fixture.db as unknown as Database);
    await store.create(user.id, { target, locale: "en", document });
    assert.deepEqual(
      (await store.list({ ...target, locale: "en" })).items[0].document,
      document,
    );
  } finally {
    await fixture.close();
  }
});
