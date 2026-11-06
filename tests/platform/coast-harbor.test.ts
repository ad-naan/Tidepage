import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  defaultAvatar,
  restoreAvatar,
  avatarSchema,
} from "../../src/modules/world/domain/coast-avatar";
import {
  harborPlaces,
  harborSpawn,
  harborWalkable,
  harborRoute,
} from "../../src/modules/world/domain/coast-harbor";
import { createCoastAvatar } from "../../src/modules/world/runtime/createCoastAvatar";

test("saved outfits reject unsupported versions and arbitrary asset values", () => {
  for (const value of [
    null,
    {},
    { ...defaultAvatar, version: 2 },
    { ...defaultAvatar, coat: "https://example.test/model" },
    { ...defaultAvatar, hairStyle: "unknown" },
  ]) {
    assert.deepEqual(restoreAvatar(value), defaultAvatar);
  }
  const next = {
    ...defaultAvatar,
    hairStyle: "bob",
    accessory: "scarf",
    coat: "coral",
  };
  assert.deepEqual(restoreAvatar(JSON.parse(JSON.stringify(next))), next);
  assert.equal(avatarSchema.safeParse(next).success, true);
});

test("walking routes connect every destination and avoid furniture, house and water", () => {
  const points = [harborSpawn, ...Object.values(harborPlaces)];
  for (const start of points)
    for (const end of points) {
      const route = harborRoute(start, end);
      assert.ok(
        route.length > 0,
        `${JSON.stringify(start)} to ${JSON.stringify(end)}`,
      );
      let previous = start;
      for (const point of route) {
        for (let t = 0; t <= 1; t += 0.1) {
          assert.ok(
            harborWalkable(
              previous.x + (point.x - previous.x) * t,
              previous.z + (point.z - previous.z) * t,
            ),
          );
        }
        previous = point;
      }
    }
  for (const point of [
    { x: 40, z: 40 },
    { x: 1.6, z: -3 },
    { x: -5, z: -2.5 },
  ]) {
    assert.equal(harborWalkable(point.x, point.z), false);
    assert.deepEqual(harborRoute(harborSpawn, point), []);
  }
});

test("character poses retain finite transforms, outfit changes reuse resources, and disposal releases them", () => {
  const avatar = createCoastAvatar(defaultAvatar);
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  avatar.root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(
        (m) => materials.add(m),
      );
    }
  });
  let disposedGeometries = 0,
    disposedMaterials = 0;
  geometries.forEach((g) =>
    g.addEventListener("dispose", () => disposedGeometries++),
  );
  materials.forEach((m) =>
    m.addEventListener("dispose", () => disposedMaterials++),
  );
  avatar.dress({
    ...defaultAvatar,
    hairStyle: "bob",
    accessory: "scarf",
    coat: "coral",
  });
  for (const pose of ["idle", "walk", "wave", "sit"] as const) {
    avatar.update(1.5, pose, false);
    avatar.root.updateMatrixWorld(true);
    avatar.root.traverse((node) =>
      assert.ok(node.matrixWorld.elements.every(Number.isFinite)),
    );
    assert.ok(new THREE.Box3().setFromObject(avatar.root).max.y < 3);
    avatar.update(3, pose, true);
  }
  const scene = new THREE.Scene();
  scene.add(avatar.root);
  avatar.dispose();
  assert.equal(avatar.root.parent, null);
  assert.equal(disposedGeometries, geometries.size);
  assert.equal(disposedMaterials, materials.size);
});
