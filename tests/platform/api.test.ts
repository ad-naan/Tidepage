import { test } from "node:test";
import assert from "node:assert/strict";
import { GET as list } from "../../src/app/api/v1/articles/route";
import { GET as detail } from "../../src/app/api/v1/articles/[slug]/route";
const context = { params: Promise.resolve({}) };
test("content API returns paginated summaries, validates inputs and reports 404", async () => {
  const valid = await list(
    new Request("http://localhost/api/v1/articles?pageSize=2&q=AI"),
    context,
  );
  const body = await valid.json();
  assert.equal(valid.status, 200);
  assert.equal(body.data.pageSize, 2);
  assert.ok(body.data.items.length <= 2);
  assert.equal("sections" in body.data.items[0], false);
  const invalid = await list(
    new Request("http://localhost/api/v1/articles?pageSize=999"),
    context,
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, "VALIDATION_ERROR");
  const missing = await detail(
    new Request("http://localhost/api/v1/articles/missing"),
    { params: Promise.resolve({ slug: "missing" }) },
  );
  assert.equal(missing.status, 404);
});
