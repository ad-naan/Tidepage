import { test } from "node:test";
import assert from "node:assert/strict";
import { createContentTestStore } from "../fixtures/content";
import type { Database } from "../../src/server/db/client";
import { usersTable } from "../../src/modules/identity/infrastructure/schema";
import { workbenchRecordsTable } from "../../src/server/workbench/schema";
import { workbenchRecords } from "../../src/server/workbench/records";
import { resolveSiteIdentity } from "../../src/modules/site-settings/domain/identity";
import {
  readPublicSiteIdentity,
  readPublicSiteFields,
} from "../../src/modules/site-settings/server";
import {
  parsePageSections,
  resolvePersonalPage,
  resolveSitePage,
  type PersonalPage,
} from "../../src/modules/site-settings/domain/pages";
import { pageMetadata } from "../../src/server/seo/metadata";

process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
const defaults = {
  name: "光阴副本集",
  title: "光阴副本集 · adnaan",
  description: "Default description",
};

test("editable personal and site pages preserve sections, interests and locale isolation after saving", async () => {
  const fixture = await createContentTestStore();
  const db = fixture.db as unknown as Database;
  const personal: PersonalPage = {
    title: "Hello",
    intro: "Intro",
    identity: "Engineer",
    personality: "INFJ",
    signature: "Tea?",
    interests: [{ label: "Music", description: "Songs" }],
    sections: [{ title: "Default", paragraphs: ["Default paragraph"] }],
  };
  const sections = [
    { title: "My walks", paragraphs: ["A quiet walk.", "Then tea."] },
    { title: "Reading", paragraphs: ["A new book."] },
  ];
  try {
    const [owner] = await db
      .insert(usersTable)
      .values({ displayName: "Owner", role: "admin" })
      .returning();
    await workbenchRecords(db).write(owner.id, "site-settings", 0, {
      revision: 1,
      translations: {
        "zh-CN": {
          aboutTitle: "Hi, I'm adnaan",
          aboutSections: JSON.stringify(sections),
          aboutInterest1: "Tea",
          aboutInterestNote1: "Slow afternoons",
          siteAboutTitle: "This coast",
          siteAboutSections: JSON.stringify(sections.slice(1)),
          contact: "private contact",
        },
      },
    });
    const fields = await readPublicSiteFields("zh-CN", db);
    assert.equal(fields.contact, undefined);
    const page = resolvePersonalPage(fields, personal);
    assert.equal(page.title, "Hi, I'm adnaan");
    assert.equal(page.personality, "INFJ");
    assert.deepEqual(page.sections, sections);
    assert.deepEqual(page.interests, [
      { label: "Tea", description: "Slow afternoons" },
    ]);
    assert.deepEqual(
      resolveSitePage(fields, {
        title: "Site",
        intro: "Site intro",
        sections: [],
      }).sections,
      sections.slice(1),
    );
    assert.deepEqual(
      resolvePersonalPage(await readPublicSiteFields("en", db), personal),
      personal,
    );
  } finally {
    await fixture.close();
  }
});

test("page sections accept existing plain text and safely fall back for invalid structured content", () => {
  const fallback = [{ title: "Fallback", paragraphs: ["A paragraph"] }];
  assert.deepEqual(parsePageSections("First paragraph\n\nSecond paragraph"), [
    { title: "", paragraphs: ["First paragraph", "Second paragraph"] },
  ]);
  assert.deepEqual(parsePageSections("[]", fallback), []);
  for (const value of [
    "",
    "[broken]",
    JSON.stringify([{ title: "Wrong", paragraphs: "not an array" }]),
  ])
    assert.deepEqual(parsePageSections(value, fallback), fallback);
});

test("public site copy trims overrides, falls back for empty fields and exposes only metadata", () => {
  assert.deepEqual(
    resolveSiteIdentity({ seoTitle: "  ", siteName: "  " }, defaults),
    defaults,
  );
  assert.deepEqual(
    resolveSiteIdentity(
      {
        siteName: " Changed ",
        siteDescription: " New introduction ",
        contact: "private contact",
      },
      defaults,
    ),
    {
      name: "Changed",
      title: "Changed · adnaan",
      description: "New introduction",
    },
  );
  assert.deepEqual(
    resolveSiteIdentity(
      {
        seoTitle: " Custom title ",
        seoDescription: " Search description ",
        siteDescription: "Introduction",
      },
      defaults,
    ),
    {
      name: defaults.name,
      title: "Custom title",
      description: "Search description",
    },
  );
});

test("site metadata reads only owner settings, isolates locales and reflects a saved revision immediately", async () => {
  const fixture = await createContentTestStore();
  const db = fixture.db as unknown as Database;
  try {
    assert.deepEqual(
      await readPublicSiteIdentity("zh-CN", defaults, db),
      defaults,
    );
    const [owner, author, reader] = await db
      .insert(usersTable)
      .values([
        { displayName: "Owner", role: "admin" },
        { displayName: "Author", role: "author" },
        { displayName: "Reader", role: "reader" },
      ])
      .returning();
    for (const user of [author, reader])
      await db.insert(workbenchRecordsTable).values({
        ownerId: user.id,
        key: "site-settings",
        revision: 1,
        value: {
          revision: 1,
          translations: { "zh-CN": { siteName: "Not the site owner" } },
        },
        updatedAt: new Date("2099-01-01"),
      });
    assert.deepEqual(
      await readPublicSiteIdentity("zh-CN", defaults, db),
      defaults,
    );
    const store = workbenchRecords(db);
    await store.write(owner.id, "site-settings", 0, {
      revision: 1,
      translations: {
        "zh-CN": {
          siteName: "Owner's journal",
          seoTitle: "Exact homepage title",
          seoDescription: "Public summary",
          contact: "private contact",
        },
      },
    });
    const identity = await readPublicSiteIdentity("zh-CN", defaults, db);
    assert.deepEqual(identity, {
      name: "Owner's journal",
      title: "Exact homepage title",
      description: "Public summary",
    });
    assert.equal(JSON.stringify(identity).includes("private contact"), false);
    assert.deepEqual(
      await readPublicSiteIdentity("en", defaults, db),
      defaults,
    );
    await store.write(owner.id, "site-settings", 1, {
      revision: 2,
      translations: {
        "zh-CN": { siteName: "Updated journal" },
        en: { seoTitle: "My English journal" },
      },
    });
    assert.equal(
      (await readPublicSiteIdentity("zh-CN", defaults, db)).title,
      "Updated journal · adnaan",
    );
    assert.equal(
      (await readPublicSiteIdentity("en", defaults, db)).title,
      "My English journal",
    );
  } finally {
    await fixture.close();
  }
});

test("homepage title is absolute and page/browser/social titles share the configured brand once", () => {
  const home = pageMetadata(
    "/",
    defaults.name,
    defaults.description,
    "zh-CN",
    ["zh-CN"],
    defaults,
  );
  assert.deepEqual(home.title, { absolute: defaults.title });
  assert.equal((home.openGraph as { title: string }).title, defaults.title);
  const page = pageMetadata(
    "/articles",
    "文章",
    "Articles",
    "zh-CN",
    ["zh-CN"],
    defaults,
  );
  assert.deepEqual(page.title, { absolute: "文章 · 光阴副本集" });
  assert.equal(
    (page.openGraph as { siteName: string }).siteName,
    defaults.name,
  );
  assert.equal((page.twitter as { title: string }).title, "文章 · 光阴副本集");
});
