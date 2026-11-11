import assert from "node:assert/strict";
import { test } from "node:test";
import {
  journalLimit,
  keepJournalEntry,
  readJournal,
  type JournalEntry,
} from "../../src/modules/journal/domain/journal";
import {
  newArticle,
  articleDraftSchema,
  publicationIssues,
} from "../../src/modules/content/domain/editor-document";
import {
  applyTranslationSegments,
  translationSegments,
} from "../../src/modules/content/domain/translation";

const bookmark: JournalEntry = {
  id: "one",
  locale: "en",
  kind: "bookmark",
  title: "A page",
  href: "/articles/a-page#section-0",
  text: "First chapter",
  savedAt: "2026-11-11T12:00:00.000Z",
};

test("journal reload retains chapters and rejects unsafe or corrupt destinations", () => {
  assert.deepEqual(
    readJournal(JSON.stringify({ version: 1, entries: [bookmark] })),
    [bookmark],
  );
  assert.deepEqual(readJournal(null), []);
  for (const href of [
    "javascript:alert(1)",
    "//example.com",
    "/admin",
    "/articles/../admin",
    "/articles/a?redirect=evil",
  ]) {
    assert.throws(() => keepJournalEntry([], { ...bookmark, href }));
  }
  assert.throws(() => readJournal("broken"));
  assert.throws(() => readJournal('{"version":2,"entries":[]}'));
});

test("repeated bookmarks update a chapter; quotes deduplicate without merging languages", () => {
  const later = {
    ...bookmark,
    id: "two",
    href: "/articles/a-page#section-3",
    text: "Later chapter",
  };
  assert.deepEqual(keepJournalEntry([bookmark], later), [later]);
  const quote = { ...bookmark, kind: "quote" as const, text: "A sentence." };
  const entries = keepJournalEntry([bookmark], quote);
  assert.equal(keepJournalEntry(entries, { ...quote, id: "again" }).length, 2);
  assert.equal(
    keepJournalEntry(entries, { ...quote, locale: "zh-CN", id: "translated" })
      .length,
    3,
  );
});

test("a full journal does not silently discard keeps and still allows bookmark updates", () => {
  const entries = Array.from({ length: journalLimit }, (_, i) => ({
    ...bookmark,
    id: String(i),
    href: `/articles/page-${i}`,
  }));
  assert.throws(() => keepJournalEntry(entries, bookmark), /JOURNAL_FULL/);
  assert.equal(
    keepJournalEntry(entries, {
      ...bookmark,
      href: "/articles/page-0#section-2",
    }).length,
    journalLimit,
  );
});

test("unfinished afterwords can be saved as drafts but cannot be published", () => {
  const draft = newArticle("afterword-test");
  draft.translations.en.afterword = {
    note: "Context",
    updates: [{ date: "2026-11-11", text: "" }],
  };
  assert.ok(articleDraftSchema.safeParse(draft).success);
  assert.ok(publicationIssues(draft, "en").includes("afterword"));
  draft.translations.en.afterword.updates[0].text = "A later thought";
  assert.ok(!publicationIssues(draft, "en").includes("afterword"));
  const source = draft.translations.en;
  const translated = applyTranslationSegments(
    source,
    translationSegments(source).map((text) => `Translated ${text}`),
  );
  assert.equal(translated.afterword?.note, "Translated Context");
  assert.equal(
    translated.afterword?.updates[0].text,
    "Translated A later thought",
  );
  assert.equal(translated.afterword?.updates[0].date, "2026-11-11");
});
