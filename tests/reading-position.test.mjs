import { test } from "node:test";
import assert from "node:assert/strict";
import { readingPosition } from "../src/shared/lib/reading-position.ts";

test("reading position respects the header boundary and keeps progress within the article", () => {
  const geometry = {
    height: 1000,
    viewportHeight: 800,
    safeTop: 112,
    sections: [300, 600, 900],
  };
  assert.deepEqual(readingPosition({ ...geometry, top: 0, height: 0 }), {
    active: 0,
    percent: 0,
    started: false,
  });
  assert.deepEqual(readingPosition({ ...geometry, top: 300 }), {
    active: 0,
    percent: 0,
    started: false,
  });
  assert.deepEqual(readingPosition({ ...geometry, top: 112 }), {
    active: 0,
    percent: 0,
    started: true,
  });
  const middle = readingPosition({
    ...geometry,
    top: -56,
    sections: [-56, 130, 600],
  });
  assert.equal(middle.active, 1);
  assert.equal(middle.percent, 50);
  assert.equal(
    readingPosition({
      ...geometry,
      top: -3000,
      sections: [-3000, -2000, -1000],
    }).percent,
    100,
  );
  assert.equal(
    readingPosition({ ...geometry, top: 100, sections: [], height: 200 })
      .percent,
    100,
  );
});
