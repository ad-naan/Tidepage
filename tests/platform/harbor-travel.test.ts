import { test } from "node:test";
import assert from "node:assert/strict";
import {
  harborMooring,
  harborLanding,
  harborRoute,
  harborSailingRoute,
  harborSpawn,
  harborDestinations,
  harborWalkable,
} from "../../src/modules/world/domain/coast-harbor";
import {
  harborIslands,
  harborSailable,
  shoreEdge,
} from "../../src/modules/world/domain/harbor-terrain";
import {
  emptyCoastRoom,
  joinCoastRoom,
  applyCoastInput,
  advanceCoastRoom,
} from "../../src/modules/world/domain/coast-room";
import { defaultAvatar } from "../../src/modules/world/domain/coast-avatar";
import { coastMovementInput } from "../../src/modules/world/domain/coast-movement";
import { restoreJourney } from "../../src/modules/world/domain/coast-journey";

test("one coast connects walking, boating, island landing and the return journey", () => {
  assert.ok(harborSailable(harborMooring.x, harborMooring.z));
  assert.ok(harborRoute(harborSpawn, harborLanding(harborMooring)!).length);
  for (const id of ["shellIsland", "windIsland", "starIsland"] as const) {
    const destination = harborDestinations[id];
    assert.deepEqual(harborRoute(harborSpawn, destination), []);
    const route = harborSailingRoute(harborMooring, destination);
    assert.ok(route.length, `${id} must be reachable by sea`);
    let previous = harborMooring;
    for (const point of route) {
      for (let t = 0; t <= 1; t += 0.05)
        assert.ok(
          harborSailable(
            previous.x + (point.x - previous.x) * t,
            previous.z + (point.z - previous.z) * t,
          ),
          `${id}: route cuts through land`,
        );
      previous = point;
    }
    const landing = harborLanding(previous)!;
    assert.ok(landing, `${id} has no landing`);
    assert.ok(
      harborRoute(landing, destination).length,
      `${id} interior is inaccessible`,
    );
    assert.ok(
      harborRoute(destination, landing).length,
      `${id} cannot return to boat`,
    );
    const home = harborSailingRoute(previous, harborDestinations.dock);
    assert.ok(home.length, `${id} cannot sail home`);
    assert.ok(harborRoute(harborLanding(home.at(-1)!)!, harborSpawn).length);
  }
});

test("the visible dry shore is walkable and stale scenery no longer blocks empty ground", () => {
  for (const island of harborIslands)
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const radius = shoreEdge(angle) * 1.01;
      assert.ok(
        harborWalkable(
          island.x + Math.sin(angle) * island.rx * radius,
          island.z + Math.cos(angle) * island.rz * radius,
        ),
      );
    }
  for (const [x, z] of [
    [-15, -23],
    [15, -28],
    [24, -43],
    [-30, -32],
    [-6, -23.45],
  ])
    assert.ok(
      harborRoute(harborSpawn, { x, z }).length,
      `phantom collider at ${x}, ${z}`,
    );
});

test("server validates boarding, sailing and landing and retains the parked boat", () => {
  const room = emptyCoastRoom(1000);
  const session = joinCoastRoom(
    room,
    "owner",
    "token",
    "traveler",
    defaultAvatar,
    1000,
  );
  assert.notEqual(session, "ROOM_FULL");
  if (session === "ROOM_FULL") return;
  let sequence = 0;
  const input = (
    travel: "walk" | "sail",
    now: number,
    direction = { x: 0, z: 0 },
  ) =>
    applyCoastInput(
      room,
      "traveler",
      "owner",
      { sequence: ++sequence, action: "idle", direction, travel },
      now,
    );
  assert.equal(input("sail", 1000), "OUT_OF_REACH");
  Object.assign(session.player, harborDestinations.dock);
  assert.equal(input("sail", 1000), null);
  assert.equal(session.player.travel, "sail");
  assert.equal(input("sail", 1000, { x: 0, z: 1 }), null);
  advanceCoastRoom(room, 1250);
  assert.ok(Math.abs(session.player.z - (harborMooring.z + 2)) < 0.001);
  input("sail", 1250);
  const parked = { x: session.player.x, z: session.player.z };
  assert.equal(input("walk", 1250), null);
  assert.equal(session.player.travel, "walk");
  assert.deepEqual(session.player.boat, parked);
  assert.ok(harborWalkable(session.player.x, session.player.z));
  assert.equal(input("sail", 1250), null);
  assert.equal(session.player.z, parked.z);
  session.player.x = 100;
  session.player.z = 100;
  assert.equal(input("walk", 1250), "OUT_OF_REACH");
  assert.equal(session.player.travel, "sail");
});

test("travel protocol stays absent on old gateways and original discoveries remain valid", () => {
  const intent = {
    action: "idle" as const,
    direction: { x: 0, z: 1 },
    travel: "sail" as const,
  };
  for (const version of [1, 2] as const)
    assert.equal("travel" in coastMovementInput(intent, 1, version), false);
  assert.equal(coastMovementInput(intent, 1, 3).travel, "sail");
  const saved = {
    fragments: ["quotes", "notes", "projects"],
    beacon: true,
    discovered: true,
  };
  assert.deepEqual(restoreJourney(saved), saved);
});
