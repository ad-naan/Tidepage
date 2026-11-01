import { test } from "node:test";
import assert from "node:assert/strict";
import { friendLinkSchema } from "../../src/modules/friends/domain/models";

test("friend destinations reject malformed, executable and credential-bearing URLs without throwing", () => {
  const friend = {
    id: "friend",
    name: "A friend",
    description: "A small corner",
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
      friendLinkSchema.safeParse({ ...friend, url }).success,
      false,
      url,
    );
  }
  assert.equal(
    friendLinkSchema.safeParse({ ...friend, url: "https://friend.example/" })
      .success,
    true,
  );
});
