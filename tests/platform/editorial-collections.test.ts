import assert from "node:assert/strict";
import { test } from "node:test";
import { articleFixtures, createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import {
  notesTable,
  articlesTable,
  projectsTable,
  quotesTable,
} from "../../src/modules/content/infrastructure/schema";
import {
  listPublishedCollection,
  openPublishedCollection,
  publishEditorialCollection,
} from "../../src/modules/content/server/managed-collections";
import { publishNote } from "../../src/modules/content/server/publish-note";
import {
  listPublicFriends,
  setFriendPublication,
} from "../../src/modules/friends/server";
import { workbenchRecords } from "../../src/server/workbench/records";
import { plainTextDocument } from "../../src/shared/contracts/rich-text";
import {
  changeEditorialTrash,
  listEditorialArticles,
} from "../../src/modules/content/server/editorial-trash";

test("existing public entries open for editing and republish with their original identity and rich content", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [owner, other] = await fixture.db
    .insert(usersTable)
    .values([
      { displayName: "Owner", role: "admin" },
      { displayName: "Author", role: "author" },
    ])
    .returning();
  const publishedAt = new Date("2020-01-01T00:00:00Z");
  const publication = {
    publishedAt,
    visibility: "published" as const,
    locale: "zh-CN" as const,
  };
  const body = plainTextDocument("Original structured content");
  await fixture.db.insert(notesTable).values({
    ...publication,
    id: "legacy-note",
    publishedOn: "2020-01-01",
    text: "Original note",
    mood: "Quiet",
    tag: "Walk",
    sketch: "tree",
    body,
  });
  await fixture.db.insert(projectsTable).values({
    ...publication,
    id: "legacy-project",
    name: "Original project",
    subtitle: "",
    description: "Summary",
    category: "open-source",
    status: "",
    sketch: "tree",
    color: "sage",
    stack: ["TypeScript"],
    body,
  });
  await fixture.db.insert(quotesTable).values({
    ...publication,
    id: "legacy-quote",
    text: "Original quote",
    author: "Owner",
  });
  const records = workbenchRecords(db);
  for (const [kind, id] of [
    ["notes", "legacy-note"],
    ["projects", "legacy-project"],
    ["quotes", "legacy-quote"],
  ] as const) {
    const entries = await listPublishedCollection(kind, db);
    assert.equal(entries.length, 1);
    assert.ok(entries[0].titles["zh-CN"]);
    assert.equal(entries[0].titles.en, undefined);
    const draft = await openPublishedCollection(kind, id, db);
    assert.equal(draft.revision, 0);
    assert.equal(
      (await records.read(owner.id, `collection:${kind}`)).value,
      null,
    );
    if (kind !== "quotes") assert.deepEqual(draft.documents?.["zh-CN"], body);
    draft.revision = 1;
    await records.write(owner.id, `collection:${kind}`, 0, [draft]);
    const request = { id, locale: "zh-CN", revision: 1 };
    if (kind === "notes") {
      await records.write(other.id, "collection:notes", 0, [draft]);
      await assert.rejects(publishNote(other.id, request, db), { status: 409 });
      await publishNote(owner.id, request, db, true);
      await assert.rejects(publishNote(other.id, request, db), { status: 409 });
    } else {
      await assert.rejects(
        publishEditorialCollection(
          owner.id,
          kind,
          { ...request, revision: 2 },
          db,
        ),
        { status: 409 },
      );
      await publishEditorialCollection(owner.id, kind, request, db);
    }
    assert.equal((await listPublishedCollection(kind, db)).length, 1);
  }
  assert.deepEqual((await fixture.db.select().from(notesTable))[0].body, body);
  const [project] = await fixture.db.select().from(projectsTable);
  assert.deepEqual(project.body, body);
  assert.deepEqual(project.stack, ["TypeScript"]);
  assert.deepEqual(project.publishedAt, publishedAt);
});

test("trash hides imported articles and notes, and restores their original public versions", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [owner, other] = await fixture.db
    .insert(usersTable)
    .values([
      { displayName: "Owner", role: "admin" },
      { displayName: "Author", role: "author" },
    ])
    .returning();
  const [article] = articleFixtures;
  const publishedAt = new Date(article.date);
  const visibility = "published" as const;
  await fixture.db.insert(articlesTable).values({
    ...article,
    publishedAt,
    visibility,
    updatedAt: new Date(article.updatedAt),
  });
  const body = plainTextDocument("Saved note");
  await fixture.db.insert(notesTable).values({
    id: "legacy-note",
    locale: "zh-CN",
    text: "Saved note",
    body,
    visibility,
    publishedAt,
    publishedOn: article.date,
    tag: "",
    mood: "",
    sketch: "tree",
  });
  const [source] = await listEditorialArticles(owner.id, true, db);
  assert.equal(source.id, `import-${article.slug}`);
  for (const [kind, id] of [
    ["articles", source.id],
    ["notes", "legacy-note"],
  ] as const) {
    const request = { kind, id, remove: true, revision: 0 };
    await assert.rejects(changeEditorialTrash(other.id, false, request, db), {
      status: 404,
    });
    const result = await changeEditorialTrash(owner.id, true, request, db);
    assert.ok(result.item.deletedAt);
    assert.deepEqual(result.item.trashedLocales, ["zh-CN"]);
    assert.equal(
      kind === "articles"
        ? await fixture.service.articleBySlug(article.slug, "zh-CN")
        : await fixture.repository.noteById("legacy-note", "zh-CN"),
      null,
    );
    await assert.rejects(
      changeEditorialTrash(owner.id, true, { ...request, remove: false }, db),
      { status: 409 },
    );
    await changeEditorialTrash(
      owner.id,
      true,
      { ...request, remove: false, revision: result.item.revision },
      db,
    );
  }
  assert.equal(
    (await fixture.service.articleBySlug(article.slug, "zh-CN"))?.title,
    article.title,
  );
  assert.deepEqual(
    (await fixture.repository.noteById("legacy-note", "zh-CN"))?.body,
    body,
  );
});

test("only an explicitly published language enters the friend directory", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [owner, other] = await fixture.db
    .insert(usersTable)
    .values([{ displayName: "Owner" }, { displayName: "Other" }])
    .returning();
  const item = {
    id: "friend",
    revision: 1,
    category: "life",
    url: "https://example.test/",
    sortOrder: 0,
    translations: { "zh-CN": { name: "Friend", description: "" } },
  };
  const records = workbenchRecords(db);
  await records.write(owner.id, "friends", 0, [item]);
  await records.write(other.id, "friends", 0, [item]);
  const request = { id: item.id, locale: "zh-CN", revision: 1 };
  assert.deepEqual(await listPublicFriends("zh-CN", db), []);
  await assert.rejects(
    setFriendPublication(owner.id, { ...request, revision: 2 }, true, db),
    { status: 409 },
  );
  await setFriendPublication(owner.id, request, true, db);
  await assert.rejects(setFriendPublication(other.id, request, true, db), {
    status: 409,
  });
  await setFriendPublication(other.id, request, false, db);
  assert.equal((await listPublicFriends("zh-CN", db))[0].name, "Friend");
  assert.deepEqual(await listPublicFriends("en", db), []);
  await setFriendPublication(owner.id, request, false, db);
  assert.deepEqual(await listPublicFriends("zh-CN", db), []);
  assert.equal((await records.read(owner.id, "friends")).value?.length, 1);
});
