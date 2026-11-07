import { test } from "node:test";
import assert from "node:assert/strict";
import { friendDraftSchema } from "../../src/modules/friends/domain/models";

test("friend destinations reject malformed, executable and credential-bearing URLs without throwing", () => {
  const friend = {
    id: "friend",
    revision: 0,
    sortOrder: 0,
    translations: { en: { name: "A friend", description: "A small corner" } },
    category: "life",
  };
  for (const url of [
    "not a URL",
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://friend.example",
    "https://user:password@friend.example",
  ]) {
    assert.equal(
      friendDraftSchema.safeParse({ ...friend, url }).success,
      false,
      url,
    );
  }
  assert.equal(
    friendDraftSchema.safeParse({ ...friend, url: "https://friend.example/" })
      .success,
    true,
  );
});
