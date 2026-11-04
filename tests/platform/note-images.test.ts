import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { noteImagesSchema } from "../../src/modules/content/domain/note-images";
import { managedItemSchema } from "../../src/modules/content/domain/managed-collections";
import { notesTable } from "../../src/modules/content/infrastructure/schema";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { mediaAssetsTable } from "../../src/modules/media/infrastructure/schema";
import { workbenchRecords } from "../../src/server/workbench/records";
import { publishNote } from "../../src/modules/content/server/publish-note";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";

const first = {
  assetId: `/uploads/${"a".repeat(64)}.jpg`,
  alt: "First photo",
  caption: "First caption",
};
const second = {
  assetId: `/uploads/${"b".repeat(64)}.png`,
  alt: "Second photo",
  caption: "",
};
test("note photos validate independent asset references and preserve their order", async () => {
  assert.deepEqual(noteImagesSchema.parse([second, first]), [second, first]);
  for (const assetId of [
    "https://example.com/image.jpg",
    "/uploads/../.env",
    "javascript:alert(1)",
  ])
    assert.equal(
      noteImagesSchema.safeParse([{ ...first, assetId }]).success,
      false,
    );
  assert.equal(noteImagesSchema.safeParse([first, first]).success, false);
  assert.equal(
    noteImagesSchema.safeParse(
      Array.from({ length: 21 }, (_, i) => ({
        ...first,
        assetId: `/uploads/${i.toString(16).padStart(64, "0")}.jpg`,
      })),
    ).success,
    false,
  );
  const store = await createContentTestStore();
  try {
    const body = {
      type: "doc",
      content: [
        {
          type: "assetImage",
          attrs: { assetId: first.assetId, alt: "An inline image" },
        },
      ],
    };
    await store.db.insert(notesTable).values({
      id: "independent",
      locale: "zh-CN",
      text: "Text",
      mood: "",
      tag: "",
      sketch: "boat",
      publishedOn: "2026-01-01",
      visibility: "published",
      publishedAt: new Date("2026-01-01"),
      images: [second],
      body,
    });
    const [note] = await store.service.notes("zh-CN");
    assert.deepEqual(note.images, [second]);
    assert.deepEqual(note.body, body);
  } finally {
    await store.close();
  }
});

test("note publication retains separate ordered images and checks saved revision, locale and asset ownership", async () => {
  const fixture = await createContentTestStore();
  try {
    const db = fixture.db as unknown as Database;
    const [owner, other] = await fixture.db
      .insert(usersTable)
      .values([
        { displayName: "Author", role: "author" },
        { displayName: "Other", role: "author" },
      ])
      .returning();
    for (const image of [first, second])
      await fixture.db.insert(mediaAssetsTable).values({
        ownerId: owner.id,
        id: image.assetId,
        name: "photo",
        mime: "image/jpeg",
        width: 100,
        height: 100,
        size: 100,
      });
    let draft = managedItemSchema.parse({
      id: "independent-note",
      revision: 1,
      updatedAt: new Date().toISOString(),
      sortOrder: 0,
      publishedOn: "2026-01-01",
      category: "",
      sketch: "boat",
      color: "sand",
      assetId: "",
      translations: {
        "zh-CN": { text: "Independent text", mood: "Calm", tag: "day" },
      },
      images: { "zh-CN": [second, first] },
    });
    const records = workbenchRecords(db);
    await records.write(owner.id, "collection:notes", 0, [draft]);
    assert.deepEqual(
      managedItemSchema
        .array()
        .parse((await records.read(owner.id, "collection:notes")).value)[0]
        .images["zh-CN"],
      [second, first],
    );
    await assert.rejects(
      publishNote(other.id, { id: draft.id, locale: "zh-CN", revision: 1 }, db),
      { code: "NOT_FOUND" },
    );
    await assert.rejects(
      publishNote(owner.id, { id: draft.id, locale: "zh-CN", revision: 2 }, db),
      { code: "CONFLICT" },
    );
    await assert.rejects(
      publishNote(owner.id, { id: draft.id, locale: "en", revision: 1 }, db),
    );
    await publishNote(
      owner.id,
      { id: draft.id, locale: "zh-CN", revision: 1 },
      db,
    );
    const [note] = await fixture.service.notes("zh-CN");
    assert.deepEqual(note.images, [second, first]);
    assert.equal(note.text, "Independent text");
    assert.equal(note.body, undefined);
    await fixture.db
      .update(mediaAssetsTable)
      .set({ archived: true })
      .where(eq(mediaAssetsTable.id, first.assetId));
    await assert.rejects(
      publishNote(owner.id, { id: draft.id, locale: "zh-CN", revision: 1 }, db),
      { code: "VALIDATION_ERROR" },
    );
    draft = {
      ...draft,
      revision: 2,
      images: { "zh-CN": [{ ...second, alt: "" }] },
    };
    await records.write(owner.id, "collection:notes", 1, [draft]);
    await assert.rejects(
      publishNote(owner.id, { id: draft.id, locale: "zh-CN", revision: 2 }, db),
    );
    assert.deepEqual((await fixture.service.notes("zh-CN"))[0].images, [
      second,
      first,
    ]);
  } finally {
    await fixture.close();
  }
});
