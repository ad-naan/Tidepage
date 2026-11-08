import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLyrics,
  activeLyricIndex,
  lyricProgress,
} from "../../src/modules/media/domain/lyrics";
import { createLyricsLoader } from "../../src/modules/media/server/lyrics";
import { parseMetingPlaylist } from "../../src/modules/media/domain/music";
import { readPublicText } from "../../src/server/http/public-text";
import {
  nextPlaybackMode,
  randomTrackIndex,
} from "../../src/modules/media/domain/playback";

test("playback modes cycle predictably and shuffle excludes the current song", () => {
  assert.equal(nextPlaybackMode("loop"), "single");
  assert.equal(nextPlaybackMode("single"), "shuffle");
  assert.equal(nextPlaybackMode("shuffle"), "loop");
  for (let current = 0; current < 4; current++) {
    const choices = [0, 0.4, 0.99].map((random) =>
      randomTrackIndex(current, 4, () => random),
    );
    assert.equal(new Set(choices).size, 3);
    assert.ok(
      choices.every(
        (choice) => choice >= 0 && choice < 4 && choice !== current,
      ),
    );
  }
  assert.equal(randomTrackIndex(0, 1), 0);
});

test("LRC expands repeated timestamps, orders lines, merges translations and honors millisecond offsets", () => {
  const result = parseLyrics(
    "\uFEFF[ti:Original test song]\r\n[offset:+500]\n[00:12.250][00:30.5]A paper boat\n[00:01.00]First line\n[00:12.250]一只纸船\n[00:12.250]一只纸船\n[00:20.000]\n[00:40.00]<00:40.00>Last <00:40.50>line",
  );
  assert.deepEqual(result, {
    lines: [
      { time: 0.5, text: "First line" },
      { time: 11.75, text: "A paper boat", translation: "一只纸船" },
      { time: 19.5, text: "" },
      { time: 30, text: "A paper boat" },
      { time: 39.5, text: "Last line" },
    ],
    plain: [],
  });
  assert.equal(
    parseLyrics("[offset:-250]\n[00:01.0]Later").lines[0].time,
    1.25,
  );
});

test("lyric selection handles the prelude, exact boundaries, instrumental gaps and seeking backwards", () => {
  const { lines } = parseLyrics(
    "[00:03]One\n[00:06]Two\n[00:10]\n[00:14]Three",
  );
  assert.equal(activeLyricIndex(lines, 0), -1);
  assert.equal(activeLyricIndex(lines, 3), 0);
  assert.equal(activeLyricIndex(lines, 6), 1);
  assert.equal(activeLyricIndex(lines, 12), 2);
  assert.equal(activeLyricIndex(lines, 15), 3);
  assert.equal(activeLyricIndex(lines, 5), 0);
  assert.equal(activeLyricIndex(lines, NaN), -1);
  assert.equal(lyricProgress(lines, 0, 4.5, 20), 0.5);
  assert.equal(lyricProgress(lines, 2, 12, 20), 0);
  assert.equal(lyricProgress(lines, 3, 17, 20), 0.5);
});

test("untimed lyrics remain readable, metadata and provider empty markers do not become lyrics", () => {
  assert.deepEqual(
    parseLyrics("[ti:Title]\n[ar:Artist]\nFirst line\nSecond line"),
    { lines: [], plain: ["First line", "Second line"] },
  );
  assert.deepEqual(parseLyrics("[00:00.00]纯音乐，请欣赏\n[00:01]"), {
    lines: [],
    plain: [],
  });
  assert.deepEqual(parseLyrics("[00:00]暂无歌词"), { lines: [], plain: [] });
  assert.deepEqual(parseLyrics("[by:Unknown]"), { lines: [], plain: [] });
  assert.deepEqual(
    parseLyrics(
      "[00:00.00]作曲 : Composer\n[00:01.00]编曲 : Arranger\n[00:05.00]纯音乐，请欣赏",
    ),
    { lines: [], plain: [] },
  );
  const track = {
    name: "Song",
    url: "https://example.com/song.mp3",
    lrc: "https://example.com/lyrics",
  };
  assert.equal(parseMetingPlaylist([track])[0].lyricsSource, track.lrc);
  assert.equal(
    parseMetingPlaylist([{ ...track, lrc: "javascript:alert(1)" }])[0]
      .lyricsSource,
    undefined,
  );
});

test("lyrics fetch is deduplicated and cached; failures retry after a short cooldown", async () => {
  let now = 0,
    calls = 0;
  const load = createLyricsLoader(
    async () => {
      calls++;
      return calls === 1
        ? "<html>Service unavailable</html>"
        : "[00:01]Test words";
    },
    () => now,
  );
  await assert.rejects(load("https://example.com/lrc"), {
    code: "LYRICS_UNAVAILABLE",
  });
  await assert.rejects(load("https://example.com/lrc"), {
    code: "LYRICS_UNAVAILABLE",
  });
  assert.equal(calls, 1);
  now = 15_001;
  const [a, b] = await Promise.all([
    load("https://example.com/lrc"),
    load("https://example.com/lrc"),
  ]);
  assert.deepEqual(a, b);
  assert.equal(a.lines[0].text, "Test words");
  assert.equal(calls, 2);
  now += 600_001;
  await load("https://example.com/lrc");
  assert.equal(calls, 3);
});

test("lyrics transport rejects local destinations before opening a connection", async () => {
  for (const url of [
    "https://127.0.0.1/lyrics",
    "https://[::1]/lyrics",
    "https://192.168.1.1/lyrics",
    "https://localhost/lyrics",
  ])
    await assert.rejects(readPublicText(url, AbortSignal.timeout(1000)));
});
