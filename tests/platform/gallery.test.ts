import assert from "node:assert/strict";
import { test } from "node:test";
import type { Database } from "../../src/server/db/client";
import { workbenchRecords } from "../../src/server/workbench/records";
import {
  listGalleryPhotos,
  setGalleryPublication,
} from "../../src/modules/content/server/gallery";
import { mediaAssetsTable } from "../../src/modules/media/infrastructure/schema";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { createContentTestStore } from "../fixtures/content";

test("gallery publishes a saved, owned photo in one language and supports unpublishing", async (t) => {
  const fixture = await createContentTestStore();
  t.after(() => fixture.close());
  const db = fixture.db as unknown as Database;
  const [owner, other] = await fixture.db
    .insert(usersTable)
    .values([{ displayName: "Owner" }, { displayName: "Other" }])
    .returning();
  const assetId = `/uploads/${"a".repeat(64)}.png`;
  await fixture.db.insert(mediaAssetsTable).values({
    ownerId: owner.id,
    id: assetId,
    name: "coast.png",
    mime: "image/png",
    size: 20,
    width: 900,
    height: 600,
  });
  const draft = {
    id: "photo",
    revision: 1,
    updatedAt: "2026-11-07T00:00:00.000Z",
    sortOrder: 0,
    publishedOn: "2026-11-07",
    category: "nature",
    sketch: "",
    color: "",
    assetId,
    translations: { en: { title: "Coast", alt: "Waves on the shore" } },
  };
  const records = workbenchRecords(db);
  await records.write(owner.id, "collection:gallery", 0, [draft]);
  await records.write(other.id, "collection:gallery", 0, [draft]);
  const request = { id: draft.id, locale: "en", revision: 1 };
  assert.deepEqual(await listGalleryPhotos("en", db), []);
  await assert.rejects(
    setGalleryPublication(owner.id, { ...request, revision: 2 }, true, db),
    { status: 409 },
  );
  await assert.rejects(setGalleryPublication(other.id, request, true, db), {
    status: 400,
  });
  await setGalleryPublication(owner.id, request, true, db);
  await setGalleryPublication(owner.id, request, true, db);
  await setGalleryPublication(other.id, request, false, db);
  assert.deepEqual(await listGalleryPhotos("zh-CN", db), []);
  assert.deepEqual(await listGalleryPhotos("en", db), [
    {
      id: "photo",
      title: "Coast",
      alt: "Waves on the shore",
      src: assetId,
      category: "nature",
      caption: "",
      place: "",
      width: 900,
      height: 600,
    },
  ]);
  await setGalleryPublication(owner.id, request, false, db);
  assert.deepEqual(await listGalleryPhotos("en", db), []);
  assert.equal(
    (await records.read(owner.id, "collection:gallery")).value?.[0].id,
    "photo",
  );
});
