import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicRoot = resolve(root, "public");
const readJson = async (file) =>
  JSON.parse(await readFile(resolve(root, file), "utf8"));
const assets = await readJson("src/shared/config/static-assets.json");
const stickers = await readJson("src/shared/config/stickers.json");
const legacy = await readJson("src/shared/config/legacy-assets.json");
const urls = [...Object.values(assets), ...stickers.map((item) => item.src)];
assert.equal(
  new Set(urls).size,
  urls.length,
  "Duplicate resource registrations",
);
assert.equal(
  new Set(stickers.map((item) => item.id)).size,
  stickers.length,
  "Duplicate sticker IDs",
);
for (const url of urls) {
  assert.match(
    url,
    /^\/assets\/[a-z0-9/-]+\.[a-z0-9]+$/i,
    `Invalid static URL: ${url}`,
  );
  const file = resolve(publicRoot, `.${url}`);
  assert.ok(
    file.startsWith(publicRoot + "/") || file.startsWith(publicRoot + "\\"),
  );
  assert.ok((await stat(file)).isFile(), `Missing resource: ${url}`);
}
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(resolve(dir, entry.name))
          : resolve(dir, entry.name),
      ),
    )
  ).flat();
}
for (const file of await files(publicRoot)) {
  const url = "/" + relative(publicRoot, file).replaceAll("\\", "/");
  assert.ok(urls.includes(url), `Unregistered public file: ${url}`);
}
// Historical article/Markdown links remain valid without copying the binaries.
for (const [source, destination] of Object.entries(legacy)) {
  assert.ok(!source.startsWith("/assets/"), `Rewrite cycle: ${source}`);
  if (destination.endsWith(":path*")) {
    const prefix = destination.slice(0, -6);
    assert.ok(
      urls.some((url) => url.startsWith(prefix)),
      `Empty rewrite: ${source}`,
    );
  } else assert.ok(urls.includes(destination), `Broken rewrite: ${source}`);
}
for (const file of await files(resolve(root, "src"))) {
  if (!/\.(ts|tsx|css)$/.test(file)) continue;
  const source = await readFile(file, "utf8");
  const oldUrl =
    /["'`](\/(?:images|brand|fonts|audio|models|stickers)\/[^"'`]+)["'`]/g;
  assert.equal(
    [...source.matchAll(oldUrl)].length,
    0,
    `Legacy static URL in ${relative(root, file)}`,
  );
}
// A moved GLB must remain self-contained: external textures would need registration too.
const model = await readFile(resolve(publicRoot, `.${assets.coastAvatar}`));
assert.equal(model.readUInt32LE(0), 0x46546c67, "Invalid GLB magic");
assert.equal(model.readUInt32LE(8), model.length, "Truncated GLB");
const gltf = JSON.parse(
  model.subarray(20, 20 + model.readUInt32LE(12)).toString("utf8"),
);
for (const resource of [...(gltf.buffers ?? []), ...(gltf.images ?? [])])
  assert.ok(
    !resource.uri || resource.uri.startsWith("data:"),
    "Unregistered external GLB resource",
  );
console.info(
  `Static assets checked: ${urls.length} files, ${stickers.length} stable sticker IDs, legacy rewrites and embedded GLB resources.`,
);
