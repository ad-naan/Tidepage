import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHarborLandscape } from "../../src/modules/world/runtime/createHarborLandscape";
import {
  harborTrees,
  harborWalkable,
  harborRoute,
  harborSpawn,
  harborMooring,
} from "../../src/modules/world/domain/coast-harbor";
import {
  emptyCoastRoom,
  joinCoastRoom,
  applyCoastInput,
  advanceCoastRoom,
} from "../../src/modules/world/domain/coast-room";
import { defaultAvatar } from "../../src/modules/world/domain/coast-avatar";
import { buildHarborSkiff } from "../../src/modules/world/runtime/harborArchitecture";
import { createHarborModeler } from "../../src/modules/world/runtime/harborModeling";

test("detailed harbor stays within the static rendering budget and releases GPU resources", () => {
  const scene = new THREE.Scene();
  const world = createHarborLandscape(scene);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let draws = 0,
    triangles = 0;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    draws++;
    triangles +=
      (object.geometry.index?.count ??
        object.geometry.getAttribute("position").count) / 3;
    geometries.add(object.geometry);
    assert.ok(
      Array.from(object.geometry.getAttribute("position").array).every(
        Number.isFinite,
      ),
    );
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      if (material instanceof THREE.MeshStandardMaterial && material.map)
        textures.add(material.map);
    }
  });
  assert.ok(draws <= 32, `${draws} environment draws exceeds budget`);
  assert.ok(
    triangles < 180_000,
    `${triangles} environment triangles exceeds budget`,
  );
  let releasedGeometries = 0,
    releasedMaterials = 0,
    releasedTextures = 0;
  geometries.forEach((g) =>
    g.addEventListener("dispose", () => releasedGeometries++),
  );
  materials.forEach((m) =>
    m.addEventListener("dispose", () => releasedMaterials++),
  );
  textures.forEach((t) =>
    t.addEventListener("dispose", () => releasedTextures++),
  );
  for (const night of [0, 0.5, 1]) {
    world.update(13.7, night);
    scene.updateMatrixWorld(true);
    scene.traverse((object) =>
      assert.ok(object.matrixWorld.elements.every(Number.isFinite)),
    );
  }
  world.dispose();
  world.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(releasedGeometries, geometries.size);
  assert.equal(releasedMaterials, materials.size);
  assert.equal(releasedTextures, textures.size);
});

test("the natural shore supports the authoritative walkable area and solid tree trunks", () => {
  const scene = new THREE.Scene();
  const world = createHarborLandscape(scene);
  scene.updateMatrixWorld(true);
  const sand = scene
    .getObjectsByProperty("isMesh", true)
    .find(
      (object) =>
        object instanceof THREE.Mesh &&
        !Array.isArray(object.material) &&
        object.material.name === "warm-shell-sand",
    )!;
  const ray = new THREE.Raycaster();
  try {
    for (let x = -9.5; x <= 9.5; x += 0.5)
      for (let z = -8; z <= 6; z += 0.5) {
        if (!harborWalkable(x, z) || (Math.abs(x) < 1.1 && z >= 3)) continue;
        ray.set(new THREE.Vector3(x, 2, z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(sand)[0];
        assert.ok(hit, `no ground below ${x}, ${z}`);
        assert.ok(
          Math.abs(hit.point.y - 0.44) < 0.015,
          `uneven playable ground at ${x}, ${z}: ${hit.point.y}`,
        );
      }
    for (const tree of harborTrees)
      assert.equal(harborWalkable(tree.x, tree.z), false);
  } finally {
    world.dispose();
  }
});

test("the skiff has outward-facing external skin and an inward-facing open interior", () => {
  const root = new THREE.Group();
  const kit = createHarborModeler();
  const skiff = buildHarborSkiff(root, kit);
  skiff.updateWorldMatrix(true, true);
  try {
    const ray = new THREE.Raycaster();
    // Looking down into the boat should hit its inside; looking up sees the hull.
    ray.set(
      new THREE.Vector3(harborMooring.x, 2, harborMooring.z),
      new THREE.Vector3(0, -1, 0),
    );
    const inside = ray
      .intersectObject(skiff)
      .find(
        (hit) => (hit.object as THREE.Mesh).material === kit.palette.paleWood,
      );
    assert.ok(inside, "inside hull is culled");
    ray.set(
      new THREE.Vector3(harborMooring.x, -2, harborMooring.z),
      new THREE.Vector3(0, 1, 0),
    );
    const outside = ray
      .intersectObject(skiff)
      .find((hit) => (hit.object as THREE.Mesh).material === kit.palette.roof);
    assert.ok(outside, "outside hull is culled");
  } finally {
    kit.dispose();
  }
});

test("the house has an accessible doorway and solid walls and furniture", () => {
  assert.ok(harborRoute(harborSpawn, { x: 4.5, z: -2.7 }).length > 0);
  assert.ok(harborRoute({ x: 4.5, z: -2.7 }, harborSpawn).length > 0);
  for (const [x, z] of [
    [1.65, -3],
    [6.35, -3],
    [4, -5.3],
    [5.6, -4.3],
    [2.35, -4.4],
  ])
    assert.equal(harborWalkable(x, z), false);
  const scene = new THREE.Scene();
  const landscape = createHarborLandscape(scene);
  try {
    landscape.update(0, 0, new THREE.Vector3(4.5, 0.49, -2.7));
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(
      new THREE.Vector3(4.5, 1.5, 0),
      new THREE.Vector3(0, 0, -1),
    );
    const wall = ray
      .intersectObjects(scene.children, true)
      .find(
        (hit) =>
          (hit.object as THREE.Mesh).material instanceof
            THREE.MeshStandardMaterial &&
          ((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial)
            .name === "lime-plaster",
      );
    assert.ok(
      wall && wall.point.z < -4.9,
      "a solid front wall still closes the doorway",
    );
    assert.equal(scene.getObjectByName("sea-house-canopy")?.visible, false);
  } finally {
    landscape.dispose();
  }
});

test("running and jumping use bounded server authority and expire naturally", () => {
  const room = emptyCoastRoom(1000);
  const session = joinCoastRoom(
    room,
    "owner",
    "token",
    "runner",
    defaultAvatar,
    1000,
  );
  assert.notEqual(session, "ROOM_FULL");
  if (session === "ROOM_FULL") return;
  session.player.x = 0;
  session.player.z = 2;
  applyCoastInput(
    room,
    "runner",
    "owner",
    { sequence: 0, direction: { x: 0, z: 1 }, action: "idle", running: true },
    1000,
  );
  advanceCoastRoom(room, 1200);
  assert.ok(Math.abs(session.player.z - 2.84) < 0.001);
  assert.equal(session.player.pose, "run");
  applyCoastInput(
    room,
    "runner",
    "owner",
    { sequence: 1, direction: { x: 0, z: 0 }, action: "jump" },
    1200,
  );
  advanceCoastRoom(room, 1400);
  assert.equal(session.player.pose, "jump");
  advanceCoastRoom(room, 2100);
  assert.equal(session.player.pose, "idle");
});
