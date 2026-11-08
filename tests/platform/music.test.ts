import {
  defaultMusicSettings,
  musicSettingsSchema,
} from "../../src/shared/contracts/music";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  metingPlaylistUrl,
  parseMetingPlaylist,
} from "../../src/modules/media/domain/music";
import { createMusicPlaylistLoader } from "../../src/modules/media/server/music";
import { settingsWriteSchema } from "../../src/modules/site-settings/domain/models";
import {
  readPublicMusicSettings,
  readSiteSettingsEditorState,
} from "../../src/modules/site-settings/server";
import { workbenchRecords } from "../../src/server/workbench/records";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import type { Database } from "../../src/server/db/client";
import { createContentTestStore } from "../fixtures/content";

const configured = {
  ...defaultMusicSettings,
  enabled: true,
  playlistId: "12345",
};
const song = {
  name: "A song",
  artist: "An artist",
  url: "https://music.example/song.mp3",
  pic: "https://music.example/cover.jpg",
};

test("music settings require a valid playlist when enabled and only accept HTTPS endpoints", () => {
  assert.ok(musicSettingsSchema.safeParse(defaultMusicSettings).success);
  for (const patch of [
    { playlistId: "" },
    { playlistId: "https://music.163.com/playlist?id=123" },
    { apiUrl: "http://example.com" },
    { apiUrl: "https://user:password@example.com" },
    { apiUrl: "https://example.com:8443" },
    { server: "unknown" },
  ]) {
    assert.equal(
      settingsWriteSchema.safeParse({
        revision: 1,
        translations: {},
        music: { ...configured, ...patch },
      }).success,
      false,
    );
  }
  const url = new URL(
    metingPlaylistUrl({
      ...configured,
      apiUrl: "https://music.example/api?type=song&server=other&keep=yes",
    }),
  );
  assert.equal(url.searchParams.get("type"), "playlist");
  assert.equal(url.searchParams.get("server"), "netease");
  assert.equal(url.searchParams.get("id"), "12345");
  assert.equal(url.searchParams.get("keep"), "yes");
});

test("Meting parser supports both field formats, removes duplicates and filters unsafe or missing sources", () => {
  const tracks = parseMetingPlaylist([
    song,
    song,
    null,
    {},
    {
      title: "Other",
      author: "Composer",
      url: "https://music.example/other",
      pic: "javascript:alert(1)",
    },
    { ...song, url: "javascript:alert(1)" },
    { ...song, url: "http://music.example/insecure" },
    { ...song, url: "" },
    { ...song, name: " " },
  ]);
  assert.deepEqual(tracks, [
    { title: "A song", artist: "An artist", source: song.url, cover: song.pic },
    {
      title: "Other",
      artist: "Composer",
      source: "https://music.example/other",
      cover: "",
    },
  ]);
  assert.throws(() => parseMetingPlaylist({ error: "upstream failed" }));
  assert.throws(() => parseMetingPlaylist("<html>Service moved</html>"));
});

test("playlist cache coalesces reads, expires, isolates changed configuration and never fetches when disabled", async () => {
  let calls = 0,
    now = 0;
  const load = createMusicPlaylistLoader(
    async () => {
      calls++;
      return [song];
    },
    () => now,
  );
  assert.deepEqual(await load(defaultMusicSettings), []);
  assert.equal(calls, 0);
  await Promise.all([load(configured), load(configured)]);
  assert.equal(calls, 1);
  now = 299_999;
  await load(configured);
  assert.equal(calls, 1);
  await load({ ...configured, playlistId: "67890" });
  await load({ ...configured, server: "tencent" });
  assert.equal(calls, 3);
  now = 300_001;
  await load(configured);
  assert.equal(calls, 4);
});

test("failed or empty playlists return a recoverable error with a short retry cooldown", async () => {
  let calls = 0,
    now = 0;
  const load = createMusicPlaylistLoader(
    async () => {
      calls++;
      return calls === 1 ? [] : [song];
    },
    () => now,
  );
  await assert.rejects(load(configured), {
    code: "MUSIC_UNAVAILABLE",
    status: 502,
  });
  await assert.rejects(load(configured), { code: "MUSIC_UNAVAILABLE" });
  assert.equal(calls, 1);
  now = 15_001;
  assert.equal((await load(configured)).length, 1);
  assert.equal(calls, 2);
});

test("global music settings survive database writes, editor reopen and disable; author drafts stay private", async () => {
  const fixture = await createContentTestStore();
  const db = fixture.db as unknown as Database;
  try {
    const [admin, author] = await db
      .insert(usersTable)
      .values([
        { displayName: "Music owner", role: "admin" },
        { displayName: "Author", role: "author" },
      ])
      .returning();
    assert.deepEqual(await readPublicMusicSettings(db), defaultMusicSettings);
    const editor = await readSiteSettingsEditorState(admin.id, db);
    assert.deepEqual(editor.music, defaultMusicSettings);
    await workbenchRecords(db).write(admin.id, "site-settings", 0, {
      ...editor,
      revision: 1,
      music: configured,
    });
    await workbenchRecords(db).write(author.id, "site-settings", 0, {
      revision: 1,
      translations: {},
      music: { ...configured, playlistId: "99999" },
    });
    assert.deepEqual(await readPublicMusicSettings(db), configured);
    const reopened = await readSiteSettingsEditorState(admin.id, db);
    assert.deepEqual(reopened.music, configured);
    assert.deepEqual(reopened.translations, editor.translations);
    await workbenchRecords(db).write(admin.id, "site-settings", 1, {
      ...reopened,
      revision: 2,
      music: { ...configured, enabled: false },
    });
    assert.equal((await readPublicMusicSettings(db)).enabled, false);
    await assert.rejects(
      workbenchRecords(db).write(admin.id, "site-settings", 2, {
        ...reopened,
        revision: 3,
        music: { ...configured, playlistId: "invalid" },
      }),
    );
    assert.equal(
      (await workbenchRecords(db).read(admin.id, "site-settings")).revision,
      2,
    );
  } finally {
    await fixture.close();
  }
});
