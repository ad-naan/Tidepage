import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { gzipSync, brotliCompressSync, deflateSync } from "node:zlib";
import { resolveWebAddresses } from "../../src/server/http/public-dns";
import { publicTarget } from "../../src/server/http/public-url";
import { readHtmlHead } from "../../src/server/http/html-head";
import { parseLinkPreview } from "../../src/server/http/link-preview";

test("synthetic proxy DNS is independently resolved and only real public addresses are pinned", async () => {
  let queries = 0;
  const system = async () => [{ address: "198.18.0.42", family: 4 }];
  const https = async (hostname: string) => {
    assert.equal(hostname, "github.com");
    queries++;
    return [{ address: "20.205.243.166", family: 4 }];
  };
  const target = await publicTarget(
    "https://github.com/a?private=value",
    (name) => resolveWebAddresses(name, system, https),
  );
  assert.equal(target.address, "20.205.243.166");
  assert.equal(target.url.hostname, "github.com");
  assert.equal(queries, 1);
  await assert.rejects(
    publicTarget("https://github.com", (name) =>
      resolveWebAddresses(name, system, async () => [
        { address: "127.0.0.1", family: 4 },
      ]),
    ),
  );
  await assert.rejects(publicTarget("https://198.18.0.42"));
});

test("ordinary private, mixed, and local DNS names cannot use the synthetic-DNS fallback", async () => {
  const fallback = async () => {
    throw new Error("Fallback must not be called");
  };
  for (const addresses of [
    [{ address: "127.0.0.1", family: 4 }],
    [
      { address: "198.18.0.42", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ],
    [
      { address: "8.8.8.8", family: 4 },
      { address: "198.18.0.42", family: 4 },
    ],
  ]) {
    assert.deepEqual(
      await resolveWebAddresses("example.com", async () => addresses, fallback),
      addresses,
    );
    await assert.rejects(
      publicTarget("https://example.com", (name) =>
        resolveWebAddresses(name, async () => addresses, fallback),
      ),
    );
  }
  assert.deepEqual(
    await resolveWebAddresses(
      "example.com",
      async () => [{ address: "8.8.8.8", family: 4 }],
      fallback,
    ),
    [{ address: "8.8.8.8", family: 4 }],
  );
  for (const host of [
    "localhost",
    "localhost.",
    "instance.local",
    "metadata.google.internal",
    "printer.lan",
    "server",
  ])
    await assert.rejects(publicTarget(`https://${host}`, fallback));
});

function response(chunks: Buffer[], headers: Record<string, string> = {}) {
  return Object.assign(Readable.from(chunks), {
    headers: { "content-type": "text/html; charset=utf-8", ...headers },
  }) as unknown as IncomingMessage;
}
const html =
  '<head><title>真实标题 🌊</title><meta name="description" content="摘要"></head>';
test("HTML streaming retains split UTF-8 and stops before oversized article bodies", async () => {
  const bytes = Buffer.from(html);
  const source = response([
    bytes.subarray(0, 20),
    bytes.subarray(20, 22),
    bytes.subarray(22),
    Buffer.alloc(2 * 1024 * 1024, 120),
  ]);
  const read = await readHtmlHead(source);
  assert.equal(read, html);
  assert.equal(source.destroyed, true);
  assert.equal(
    parseLinkPreview(read, "https://example.com").title,
    "真实标题 🌊",
  );
  assert.equal(
    (await readHtmlHead(response([Buffer.from("x".repeat(4096))]), 1000))
      .length,
    1000,
  );
});

test("compressed and non-UTF-8 metadata can be decoded without removing size limits", async () => {
  for (const [encoding, bytes] of [
    ["gzip", gzipSync(html)],
    ["br", brotliCompressSync(html)],
    ["deflate", deflateSync(html)],
  ] as const)
    assert.equal(
      await readHtmlHead(response([bytes], { "content-encoding": encoding })),
      html,
    );
  const latin = Buffer.from("<head><title>Caf\u00e9</title></head>", "latin1");
  assert.match(
    await readHtmlHead(
      response([latin], { "content-type": "text/html; charset=iso-8859-1" }),
    ),
    /Café/,
  );
  assert.equal(
    (
      await readHtmlHead(
        response([gzipSync("x".repeat(8192))], { "content-encoding": "gzip" }),
        1000,
      )
    ).length,
    1000,
  );
});
