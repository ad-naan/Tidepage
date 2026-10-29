import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
const cache = new Map();
function load(path) {
  path = resolve(path);
  if (cache.has(path)) return cache.get(path);
  const module = { exports: {} };
  cache.set(path, module.exports);
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  new Function("module", "exports", "require", compiled)(
    module,
    module.exports,
    (name) => load(resolve(dirname(path), name + ".ts")),
  );
  return module.exports;
}
const { emptyJourney, interactJourney, restoreJourney, journeyStops } = load(
  "src/modules/world/domain/coast-journey.ts",
);
const { seaRoute, seaIsClear, berth } = load(
  "src/modules/world/domain/coast-navigation.ts",
);
test("the beacon and secret require actual progression", () => {
  let j = emptyJourney;
  assert.equal(interactJourney(j, "articles", false).journey.beacon, false);
  assert.equal(interactJourney(j, "secret", true).journey.discovered, false);
  for (const id of ["quotes", "notes", "projects"])
    j = interactJourney(j, id, false).journey;
  assert.equal(interactJourney(j, "quotes", false).journey.fragments.length, 3);
  j = interactJourney(j, "articles", false).journey;
  assert.equal(j.beacon, true);
  assert.equal(interactJourney(j, "secret", false).journey.discovered, false);
  assert.equal(interactJourney(j, "secret", true).journey.discovered, true);
});
test("invalid saved progress cannot unlock the hidden bay", () => {
  for (const input of [
    null,
    [],
    {},
    { fragments: ["quotes", "quotes", "bad"], beacon: true, discovered: true },
  ]) {
    assert.equal(restoreJourney(input).beacon, false);
    assert.equal(restoreJourney(input).discovered, false);
  }
});
test("every berth is reachable without crossing shoreline collision bounds", () => {
  const starts = [{ x: 9, z: 12 }, ...journeyStops.map((p) => berth(p.id))];
  for (const from of starts)
    for (const stop of journeyStops) {
      const to = berth(stop.id);
      if (Math.hypot(from.x - to.x, from.z - to.z) < 1) continue;
      const path = seaRoute(from, to);
      assert.ok(path.length, `${JSON.stringify(from)} to ${stop.id}`);
      let previous = from;
      for (const p of path) {
        for (let t = 0; t <= 1; t += 0.1)
          assert.ok(
            seaIsClear(
              previous.x + (p.x - previous.x) * t,
              previous.z + (p.z - previous.z) * t,
            ),
            `shore collision toward ${stop.id}`,
          );
        previous = p;
      }
    }
});
