import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicAddress,
  publicTarget,
} from "../../src/server/http/public-url";
import { parseLinkPreview } from "../../src/server/http/link-preview";
import { commentLayout } from "../../src/modules/engagement/domain/comment-layout";
import type { Comment } from "../../src/modules/engagement/domain/discussion";

test("link previews reject non-public IPv4, IPv6, mapped addresses and credentials", async () => {
  for (const address of [
    "0.0.0.0",
    "127.0.0.1",
    "10.0.0.5",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "100.64.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:8.8.8.8",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::",
    "64:ff9b::7f00:1",
  ])
    assert.equal(isPublicAddress(address), false, address);
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(address), true, address);
  for (const url of [
    "http://127.1/",
    "http://0x7f000001/",
    "http://2130706433/",
    "http://[::1]/",
    "https://user:password@example.com/",
    "https://example.com:5432/",
    "file:///etc/passwd",
  ])
    await assert.rejects(publicTarget(url), { name: /Error/ }, url);
});

test("metadata parsing respects precedence, entities, relative artwork and text bounds", () => {
  const result = parseLinkPreview(
    `<head><title>Fallback</title>
    <meta content='A &amp; B &#x1f30a;' property='og:title'>
    <meta name="description" content="Plain description">
    <meta property="og:description" content="  A\n longer description  ">
    <meta property="og:site_name" content="Tidepage">
    <meta property="og:image" content="/cover.png?a=1&amp;b=2"></head>
    <meta property="og:title" content="Not head metadata">`,
    "https://example.com/article",
  );
  assert.deepEqual(result, {
    title: "A & B 🌊",
    description: "A longer description",
    siteName: "Tidepage",
    artworkUrl: "https://example.com/cover.png?a=1&b=2",
  });
  assert.equal(
    parseLinkPreview(
      '<meta property="og:image" content="javascript:alert(1)">',
      "https://example.com",
    ).artworkUrl,
    undefined,
  );
  assert.equal(
    parseLinkPreview(`<title>${"a".repeat(500)}</title>`, "https://example.com")
      .title?.length,
    200,
  );
});

test("public DNS resolution rejects mixed answers and pins the selected public answer", async () => {
  await assert.rejects(
    publicTarget("https://example.com", async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]),
  );
  const target = await publicTarget("https://example.com", async () => [
    { address: "1.1.1.1", family: 4 },
  ]);
  assert.equal(target.address, "1.1.1.1");
  assert.equal(target.url.hostname, "example.com");
});

function comment(id: string, parentId: string | null = null): Comment {
  return {
    id,
    parentId,
    body: id,
    author: "Reader",
    createdAt: "2026-11-06T00:00:00.000Z",
    replyTo: null,
  };
}
test("comment layout keeps replies together, bounds indentation and preserves missing parents and cycles", () => {
  const items = [
    comment("one"),
    comment("two"),
    comment("reply", "one"),
    comment("deep", "reply"),
    comment("orphan", "missing"),
    comment("a", "b"),
    comment("b", "a"),
  ];
  const rows = commentLayout(items);
  assert.deepEqual(
    rows.map(({ item }) => item.id),
    ["one", "reply", "deep", "two", "orphan", "a", "b"],
  );
  assert.equal(rows[0].reply, false);
  assert.equal(rows[2].reply, true);
  assert.equal(new Set(rows.map(({ item }) => item.id)).size, items.length);
  assert.equal(commentLayout([comment("self", "self")]).length, 1);
});
