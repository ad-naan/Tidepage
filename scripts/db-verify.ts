import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { getDb, closeDatabase, type Database } from "../src/server/db/client";
import {
  usersTable,
  identitiesTable,
} from "../src/modules/identity/infrastructure/schema";
import { resolveOAuthAccount } from "../src/modules/identity/server/oauth-accounts";
import { profileAvatarColumn } from "../src/modules/identity/server/profile";
import { discussionStore } from "../src/modules/engagement/server";
import { mediaAssetsTable } from "../src/modules/media/infrastructure/schema";
import { workbenchRecordsTable } from "../src/server/workbench/schema";
import { workbenchRecords } from "../src/server/workbench/records";
import { newArticle } from "../src/modules/content/domain/editor-document";
import { plainTextDocument } from "../src/shared/contracts/rich-text";
import { managedItemSchema } from "../src/modules/content/domain/managed-collections";
import { publishArticle } from "../src/modules/content/server/publish-article";
import { publishNote } from "../src/modules/content/server/publish-note";
import {
  publishEditorialCollection,
  openPublishedCollection,
} from "../src/modules/content/server/managed-collections";
import { changeEditorialTrash } from "../src/modules/content/server/editorial-trash";
import {
  setGalleryPublication,
  listGalleryPhotos,
} from "../src/modules/content/server/gallery";
import {
  setFriendPublication,
  listPublicFriends,
} from "../src/modules/friends/server";
import { readPublicSiteFields } from "../src/modules/site-settings/server";
import { resolveSitePresentation } from "../src/modules/site-settings/domain/presentation";
import { postgresContentRepository } from "../src/modules/content/infrastructure/postgres-repository";

config({ path: [".env.local", ".env"], quiet: true });

// Every operation is restricted to newly generated fixtures in ONE uncommitted
// transaction. Production readers cannot see these rows. Never call API/cache
// invalidation or filesystem uploads here. Success also ends in ROLLBACK.
const rollback = new Error("VERIFIED_ROLLBACK");
const ownerId = randomUUID();
const id = `verify-${randomUUID()}`;
let stage = "connection";
try {
  await getDb().transaction(async (tx) => {
    const db = tx as unknown as Database;
    const store = workbenchRecords(db);
    const repository = postgresContentRepository(db);
    await db.insert(usersTable).values({
      id: ownerId,
      displayName: "Rollback verification",
      role: "admin",
    });

    stage = "settings round trip, isolation and stale revision";
    const settings = {
      revision: 1,
      translations: {
        "zh-CN": {
          footer: "Verification footer",
          publicContact: "Public note",
          contact: "Private fixture",
          navigationOrder: "projects,articles",
          featuredSlugs: id,
        },
      },
    };
    await store.write(ownerId, "site-settings", 0, settings);
    await db
      .update(workbenchRecordsTable)
      .set({ updatedAt: new Date("9999-01-01T00:00:00Z") })
      .where(
        and(
          eq(workbenchRecordsTable.ownerId, ownerId),
          eq(workbenchRecordsTable.key, "site-settings"),
        ),
      );
    const fields = await readPublicSiteFields("zh-CN", db);
    assert.equal(fields.contact, undefined);
    assert.equal(resolveSitePresentation(fields).footer, "Verification footer");
    assert.equal((await readPublicSiteFields("en", db)).footer, undefined);
    await assert.rejects(store.write(ownerId, "site-settings", 0, settings), {
      status: 409,
    });
    console.info(`PASS ${stage}`);

    stage = "article draft, publication, locale and trash/restore";
    const draft = newArticle(id);
    draft.revision = 1;
    draft.translations["zh-CN"] = {
      ...draft.translations["zh-CN"],
      title: "Rollback article",
      slug: id,
      body: plainTextDocument("Verification body"),
    };
    await store.write(ownerId, "articles", 0, [draft]);
    const request = { id, locale: "zh-CN", revision: 1 };
    await assert.rejects(
      publishArticle(ownerId, { ...request, revision: 2 }, db),
      { status: 409 },
    );
    await publishArticle(ownerId, request, db);
    await publishArticle(ownerId, request, db);
    assert.equal(
      (await repository.articleBySlug(id, "zh-CN"))?.title,
      "Rollback article",
    );
    assert.equal(await repository.articleBySlug(id, "en"), null);
    await changeEditorialTrash(
      ownerId,
      false,
      { kind: "articles", id, revision: 1, remove: true },
      db,
    );
    assert.equal(await repository.articleBySlug(id, "zh-CN"), null);
    await changeEditorialTrash(
      ownerId,
      false,
      { kind: "articles", id, revision: 2, remove: false },
      db,
    );
    assert.ok(await repository.articleBySlug(id, "zh-CN"));
    console.info(`PASS ${stage}`);

    stage = "OAuth avatar, account query and comment read-back";
    const avatarUrl = "https://avatars.githubusercontent.com/u/1?v=4";
    await db
      .insert(identitiesTable)
      .values({ userId: ownerId, provider: "github", providerAccountId: id });
    const principal = await resolveOAuthAccount(
      {
        provider: "github",
        providerAccountId: id,
        displayName: "Rollback verification",
        avatarUrl,
        profileUrl: null,
      },
      db,
    );
    assert.equal(principal.avatarUrl, avatarUrl);
    const [account] = await db
      .select({ avatarUrl: profileAvatarColumn(usersTable.id) })
      .from(usersTable)
      .where(eq(usersTable.id, ownerId));
    assert.equal(account.avatarUrl, avatarUrl);
    const comments = discussionStore(db);
    const comment = await comments.create(ownerId, {
      target: { type: "article", id },
      locale: "zh-CN",
      body: "Rollback avatar verification",
    });
    assert.equal(comment.avatarUrl, avatarUrl);
    assert.equal(
      (await comments.list({ type: "article", id, locale: "zh-CN" })).items[0]
        .avatarUrl,
      avatarUrl,
    );
    console.info(`PASS ${stage}`);
    stage = "notes, projects and quotes publication";

    const base = managedItemSchema.parse({
      id,
      revision: 1,
      updatedAt: new Date().toISOString(),
      sortOrder: 0,
      publishedOn: "2020-01-01",
      category: "open-source",
      sketch: "boat",
      color: "sage",
      assetId: "",
      translations: {
        "zh-CN": {
          text: "Verification text",
          name: "Verification project",
          stack: "TypeScript,React",
          author: "Verification",
        },
      },
      documents: { "zh-CN": plainTextDocument("Structured content") },
    });
    for (const kind of ["notes", "projects", "quotes"] as const) {
      await store.write(ownerId, `collection:${kind}`, 0, [base]);
      if (kind === "notes") await publishNote(ownerId, request, db);
      else await publishEditorialCollection(ownerId, kind, request, db);
      const reopened = await openPublishedCollection(kind, id, db, {
        ownerId,
        adopt: false,
      });
      assert.equal(reopened.id, id);
      assert.equal(reopened.translations.en, undefined);
    }
    console.info(`PASS ${stage}`);

    stage = "gallery media ownership and publish/unpublish";
    const assetId = `/uploads/${randomUUID().replaceAll("-", "").repeat(2)}.png`;
    await db.insert(mediaAssetsTable).values({
      id: assetId,
      ownerId,
      name: "verification.png",
      mime: "image/png",
      size: 100,
      width: 640,
      height: 480,
    });
    const photo = {
      ...base,
      category: "daily",
      assetId,
      translations: {
        "zh-CN": {
          title: "Verification image",
          alt: "Test image",
          description: "",
          location: "",
        },
      },
    };
    await store.write(ownerId, "collection:gallery", 0, [photo]);
    await setGalleryPublication(ownerId, request, true, db);
    assert.ok(
      (await listGalleryPhotos("zh-CN", db)).some((item) => item.id === id),
    );
    await setGalleryPublication(ownerId, request, false, db);
    assert.ok(
      !(await listGalleryPhotos("zh-CN", db)).some((item) => item.id === id),
    );
    console.info(`PASS ${stage}`);

    stage = "friends publish/unpublish";
    await store.write(ownerId, "friends", 0, [
      {
        id,
        revision: 1,
        url: "https://example.com",
        category: "technology",
        sortOrder: 0,
        translations: {
          "zh-CN": { name: "Verification", description: "Fixture" },
        },
      },
    ]);
    await setFriendPublication(ownerId, request, true, db);
    assert.ok(
      (await listPublicFriends("zh-CN", db)).some((item) => item.id === id),
    );
    await setFriendPublication(ownerId, request, false, db);
    assert.ok(
      !(await listPublicFriends("zh-CN", db)).some((item) => item.id === id),
    );
    console.info(`PASS ${stage}`);
    throw rollback;
  });
} catch (error) {
  if (error !== rollback) {
    // Do not log connection URLs, query parameters or existing records.
    console.error(
      `FAIL ${stage} (${error instanceof Error ? error.name : "UnknownError"}); transaction rolled back.`,
    );
    process.exitCode = 1;
  }
} finally {
  try {
    const remaining = await getDb()
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, ownerId));
    assert.equal(remaining.length, 0);
    console.info("PASS rollback verified; no fixtures persisted.");
  } finally {
    await closeDatabase();
  }
}
