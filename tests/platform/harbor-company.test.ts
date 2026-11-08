import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companionTraversable,
  createHarborFollower,
  createHarborMoments,
  companionApproach,
} from "../../src/modules/world/domain/harbor-company";
import {
  harborCompanion,
  nearHarborCompanion,
} from "../../src/modules/world/domain/harbor-companion";
import {
  harborDestinations,
  harborRoute,
  harborSpawn,
  harborWalkable,
} from "../../src/modules/world/domain/coast-harbor";
import { guideRequestSchema } from "../../src/modules/world/domain/harbor-guide";
import { companionConversationSchema } from "../../src/modules/world/domain/companion-conversation";

test("meeting a travelling companion stops beside it and dialogue accepts the current island", () => {
  const point = companionApproach({ x: -34, z: 32 }, { x: -30, z: 32 });
  assert.ok(point && harborWalkable(point.x, point.z));
  assert.ok(Math.abs(Math.hypot(point.x + 34, point.z - 32) - 1.7) < 0.001);
  const input = { locale: "en", place: "shellIsland", turns: [] };
  assert.ok(
    guideRequestSchema.safeParse({
      ...input,
      question: "Stay here with me",
      context: {
        night: true,
        sailing: false,
        lookingSky: true,
        following: true,
      },
    }).success,
  );
  assert.ok(
    companionConversationSchema.safeParse({
      ...input,
      topic: "The sea",
      night: true,
      sailing: false,
    }).success,
  );
  assert.equal(
    companionConversationSchema.safeParse({
      ...input,
      place: "invented",
      topic: "The sea",
      night: true,
    }).success,
    false,
  );
});

test("companions navigate around the cottage and stay within conversation distance", () => {
  const follower = createHarborFollower(harborCompanion.position, -1);
  const player = { x: 4.5, z: -2.7 };
  let previous = { ...follower.position };
  for (let i = 0; i < 1000; i++) {
    follower.step(player, 0, 0.05, true, false);
    assert.ok(harborWalkable(follower.position.x, follower.position.z));
    assert.ok(
      Math.hypot(
        follower.position.x - previous.x,
        follower.position.z - previous.z,
      ) <=
        4.6 * 0.05 + 1e-8,
    );
    previous = { ...follower.position };
  }
  assert.ok(nearHarborCompanion(player, follower.position));
  const resting = { ...follower.position };
  follower.step({ x: -42, z: -49 }, 1, 20, false, false);
  assert.deepEqual(follower.position, resting);
});

test("companions can follow across the shore and ocean to a second island without teleporting", () => {
  const follower = createHarborFollower(harborCompanion.position, 1);
  const stops = [
    { x: 0, z: 6 },
    { x: 0, z: 18 },
    { x: -24, z: 32 },
    { x: -34, z: 32 },
  ];
  for (const player of stops) {
    for (let i = 0; i < 500; i++) {
      const before = { ...follower.position };
      follower.step(player, 0, 0.05, true, true);
      assert.ok(companionTraversable(follower.position.x, follower.position.z));
      assert.ok(
        Math.hypot(
          follower.position.x - before.x,
          follower.position.z - before.z,
        ) <=
          9.2 * 0.05 + 1e-8,
      );
    }
    assert.ok(
      Math.hypot(
        follower.position.x - player.x,
        follower.position.z - player.z,
      ) < 4,
    );
  }
  const before = { ...follower.position };
  for (let i = 0; i < 20; i++)
    follower.step({ x: 3500, z: 3500 }, 0, 0.05, true, true);
  assert.deepEqual(follower.position, before);
  assert.equal(companionTraversable(NaN, 0), false);
  assert.equal(companionTraversable(4001, 0), false);
});

test("companions settle apart beside the cottage even when their fallback positions overlap", () => {
  for (let heading = 0; heading < Math.PI * 2; heading += Math.PI / 4) {
    const otter = createHarborFollower({ x: 1, z: 1.93 }, -1);
    const turtle = createHarborFollower({ x: 0.84, z: 1.17 }, 1);
    const player = { x: 2.26, z: 1.06 };
    for (let i = 0; i < 400; i++) {
      otter.step(player, heading, 0.05, true, false, turtle.position);
      turtle.step(player, heading, 0.05, true, false, otter.position);
      assert.ok(companionTraversable(otter.position.x, otter.position.z));
      assert.ok(companionTraversable(turtle.position.x, turtle.position.z));
    }
    assert.ok(
      Math.hypot(
        otter.position.x - turtle.position.x,
        otter.position.z - turtle.position.z,
      ) > 1.8,
      `companions overlap at heading ${heading}`,
    );
  }
});

test("ordinary company is quiet when paused or far away and does not repeat idle greetings", () => {
  const moments = createHarborMoments();
  const input = {
    seconds: 0.05,
    nearby: true,
    paused: false,
    wave: false,
    sky: false,
    sailing: false,
    night: false,
    sitting: false,
  };
  const lines: string[] = [];
  for (let i = 0; i < 2000; i++)
    assert.equal(moments.step({ ...input, paused: true }), null);
  for (let i = 0; i < 2000; i++) {
    const line = moments.step(input);
    if (line) lines.push(line);
  }
  assert.deepEqual(lines, ["welcome"]);
  assert.equal(moments.step({ ...input, wave: true }), "wave");
  assert.equal(moments.step({ ...input, wave: true }), null);
  for (let i = 0; i < 2000; i++)
    assert.equal(
      moments.step({ ...input, nearby: false, sitting: true }),
      null,
    );
});

test("a companion keeps moving smoothly behind a steady walker instead of stopping at every planning tick", () => {
  const follower = createHarborFollower({ x: 0, z: -22 }, 1);
  let stopped = 0;
  let previousSpeed = 0;
  for (let i = 0; i < 360; i++) {
    const before = { ...follower.position };
    const movement = follower.step(
      { x: 0, z: -22 - (i * 2.4) / 60 },
      Math.PI,
      1 / 60,
      true,
      false,
    );
    const speed =
      Math.hypot(
        follower.position.x - before.x,
        follower.position.z - before.z,
      ) * 60;
    if (i > 120 && !movement.moving) stopped++;
    assert.ok(
      speed <= previousSpeed + 8 / 60 + 1e-6,
      `abrupt acceleration at ${i}`,
    );
    previousSpeed = speed;
  }
  assert.equal(stopped, 0);
});

test("all mainland destinations remain reachable and the three islands require a sea crossing", () => {
  const islands = new Set(["shellIsland", "windIsland", "starIsland"]);
  for (const [id, destination] of Object.entries(harborDestinations)) {
    assert.ok(
      harborWalkable(destination.x, destination.z),
      `${id} is obstructed`,
    );
    const route = harborRoute(harborSpawn, destination);
    assert.equal(
      route.length > 0,
      !islands.has(id),
      `${id} has the wrong travel connection`,
    );
  }
});
