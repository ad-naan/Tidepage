import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createOtterRig,
  otterLook,
} from "../../src/modules/world/domain/hero-otter-rig";

const rest = new Float32Array(
  Array.from({ length: 21 * 21 }, (_, index) => [
    (index % 21) * 12.8,
    Math.floor(index / 21) * 12.8,
  ]).flat(),
);
test("otter mesh retains its exact original pose and keeps the lower body planted", () => {
  const pose = new Float32Array(rest.length);
  const deform = createOtterRig(rest, 256);
  deform(pose, { x: 0, y: 0 });
  assert.deepEqual(pose, rest);
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      deform(pose, { x, y });
      pose.forEach((value, index) => {
        assert.ok(Number.isFinite(value));
        assert.ok(Math.abs(value - rest[index]) < 12);
        if (rest[Math.floor(index / 2) * 2 + 1] >= 200)
          assert.ok(Math.abs(value - rest[index]) < 0.001);
      });
    }
  }
  // Returning the gaze cannot accumulate deformation across interactions.
  deform(pose, { x: 0, y: 0 });
  assert.deepEqual(pose, rest);
});
test("otter gaze follows the requested side and bounds invalid or distant pointer input", () => {
  assert.deepEqual(otterLook(Infinity, NaN), { x: 0, y: 0 });
  assert.deepEqual(otterLook(-100, 100), { x: -1, y: 1 });
  const pose = new Float32Array(rest.length);
  const deform = createOtterRig(rest, 256);
  const head = (7 * 21 + 13) * 2;
  deform(pose, { x: 1, y: 1 });
  assert.ok(pose[head] > rest[head]);
  assert.ok(pose[head + 1] > rest[head + 1]);
  deform(pose, { x: -1, y: -1 });
  assert.ok(pose[head] < rest[head]);
  assert.ok(pose[head + 1] < rest[head + 1]);
});
