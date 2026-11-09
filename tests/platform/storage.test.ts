import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  saveImage,
  readImage,
} from "../../src/modules/media/infrastructure/local-storage";
import { workbenchRecords } from "../../src/server/workbench/records";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { newArticle } from "../../src/modules/content/domain/editor-document";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";

test("local image storage verifies bytes, deduplicates and rejects traversal and executable formats", async () => {
  const parent = path.resolve(".cache/storage-tests");
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent, "upload-"));
  try {
    const bytes = await sharp({
      create: { width: 2, height: 3, channels: 3, background: "#ffffff" },
    })
      .png()
      .toBuffer();
    const asset = await saveImage(bytes, "../../fake.html", directory);
    assert.equal(asset.mime, "image/png");
    assert.equal(asset.name, "fake.html");
    assert.match(asset.id, /^\/uploads\/[a-f0-9]{64}\.png$/);
    await saveImage(bytes, "same.png", directory);
    assert.equal((await fs.readdir(directory)).length, 1);
    assert.deepEqual(
      (await readImage(path.basename(asset.id), directory)).bytes,
      bytes,
    );
    await assert.rejects(readImage("../.env", directory), {
      code: "NOT_FOUND",
    });
    await assert.rejects(
      saveImage(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"/>',
        ),
        "fake.png",
        directory,
      ),
      { code: "VALIDATION_ERROR" },
    );
    await assert.rejects(
      saveImage(Buffer.from("<script>evil()</script>"), "fake.png", directory),
      { code: "VALIDATION_ERROR" },
    );
  } finally {
    assert.ok(directory.startsWith(parent + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("new photos keep allowlisted camera settings and strip private EXIF from the stored file", async () => {
  const parent = path.resolve(".cache/storage-tests");
  await fs.mkdir(parent, { recursive: true });
  const directory = await fs.mkdtemp(path.join(parent, "capture-"));
  try {
    const source = await sharp({
      create: { width: 3, height: 2, channels: 3, background: "#e99136" },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .withExifMerge({
        IFD0: { Make: "Example", Model: "Example One" },
        IFD2: {
          FNumber: "17/10",
          ExposureTime: "1/125",
          ISOSpeedRatings: "80",
          FocalLength: "24/1",
          LensModel: "Prime 24mm",
          BodySerialNumber: "serial-private",
          DateTimeOriginal: "2026:11:09 13:14:15",
        },
        IFD3: {
          GPSLatitude: "31/1 13/1 50/1",
          GPSLatitudeRef: "N",
          GPSLongitude: "121/1 28/1 26/1",
          GPSLongitudeRef: "E",
        },
      })
      .toBuffer();
    assert.ok(
      (await sharp(source).metadata()).exif?.includes(
        Buffer.from("serial-private"),
      ),
    );
    const saved = await saveImage(source, "photo.jpg", directory);
    assert.deepEqual(saved.capture, {
      camera: "Example One",
      lens: "Prime 24mm",
      focalLength: 24,
      aperture: 1.7,
      exposureSeconds: 0.008,
      iso: 80,
      locality: { name: "Shanghai", zh: "上海" },
    });
    assert.deepEqual([saved.width, saved.height], [2, 3]);
    const { bytes } = await readImage(path.basename(saved.id), directory);
    assert.equal((await sharp(bytes).metadata()).exif, undefined);
    assert.equal(bytes.includes(Buffer.from("serial-private")), false);
  } finally {
    assert.ok(directory.startsWith(parent + path.sep));
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("server working copies isolate authors and reject concurrent or stale writes", async () => {
  const store = await createContentTestStore();
  try {
    const [first, second] = await store.db
      .insert(usersTable)
      .values([
        { displayName: "one", role: "admin" },
        { displayName: "two", role: "author" },
      ])
      .returning();
    const records = workbenchRecords(store.db as unknown as Database);
    assert.deepEqual(await records.read(first.id, "articles"), {
      revision: 0,
      value: null,
    });
    assert.deepEqual(await records.write(first.id, "articles", 0, []), {
      revision: 1,
    });
    const results = await Promise.allSettled([
      records.write(first.id, "articles", 1, [newArticle("first")]),
      records.write(first.id, "articles", 1, [newArticle("second")]),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    assert.equal((await records.read(first.id, "articles")).revision, 2);
    assert.deepEqual(await records.read(second.id, "articles"), {
      revision: 0,
      value: null,
    });
    await assert.rejects(records.write(second.id, "articles", 3, []), {
      code: "CONFLICT",
    });
    assert.equal((await records.read(second.id, "articles")).revision, 0);
    await assert.rejects(
      records.write(first.id, "articles", 2, [{ malicious: true }]),
    );
  } finally {
    await store.close();
  }
});
