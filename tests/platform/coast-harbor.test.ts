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
import {
  coastMovementInput,
  harborInputKey,
} from "../../src/modules/world/domain/coast-movement";
import { z } from "zod";
import { coastInputSchema } from "../../src/shared/contracts/coast-space";

test("movement remains valid on strict legacy gateways and negotiates running and jumping", () => {
  const legacy = z
    .object({
      sequence: z.number(),
      direction: z.object({ x: z.number(), z: z.number() }).strict(),
      action: z.enum(["idle", "sit", "wave"]),
    })
    .strict();
  for (const action of ["idle", "jump", "sit", "wave"] as const) {
    const intent = { direction: { x: 0, z: -1 }, action, running: true };
    const oldInput = coastMovementInput(intent, 1, 1);
    assert.equal(legacy.safeParse(oldInput).success, true);
    assert.equal("running" in oldInput, false);
    assert.deepEqual(oldInput.direction, intent.direction);
    const newInput = coastMovementInput(intent, 2, 2);
    assert.equal(coastInputSchema.safeParse(newInput).success, true);
    assert.equal(newInput.action, action);
    assert.equal(newInput.running, true);
  }
});

test("physical movement keys survive IME composition and shifted keyboard layouts", () => {
  for (const key of ["W", "A", "S", "D", "E", "J", "L", "I", "K", "Q", "R"]) {
    assert.equal(
      harborInputKey({ code: `Key${key}`, key: "Process" }),
      key.toLowerCase(),
    );
  }
  assert.equal(harborInputKey({ code: "KeyW", key: "z" }), "w");
  assert.equal(harborInputKey({ code: "Space", key: "Process" }), " ");
  assert.equal(harborInputKey({ code: "ShiftRight", key: "Shift" }), "shift");
  assert.equal(harborInputKey({ code: "ArrowUp", key: "ArrowUp" }), "arrowup");
});

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
    { x: 54, z: 40 },
    { x: 1.6, z: -3 },
    { x: -5, z: -2.5 },
  ]) {
    assert.equal(harborWalkable(point.x, point.z), false);
    assert.deepEqual(harborRoute(harborSpawn, point), []);
  }
});

// A bound fixture catches shared-skeleton regressions without browser image decoding.
function avatarAsset() {
  const scene = new THREE.Group();
  const bone = new THREE.Bone();
  bone.name = "Hip";
  const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4),
  );
  const weights = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  const material = new THREE.MeshStandardMaterial({ color: "#78a793" });
  material.name = "Seafoam_Tailored_Fabric";
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]));
  scene.add(mesh);
  const animations = ["Idle", "Walk", "Run", "Jump", "Sit", "Wave"].map(
    (name) =>
      new THREE.AnimationClip(name, 1, [
        new THREE.NumberKeyframeTrack(
          "Hip.position[y]",
          [0, 0.5, 1],
          [0, name === "Idle" ? 0 : 0.5, 0],
        ),
      ]),
  );
  return { scene, animations };
}

import { createAvatarAssetCache } from "../../src/modules/world/runtime/coastAvatarAsset";

test("avatar clones isolate bones, outfit tint and animation; disposing a peer preserves shared geometry", () => {
  const asset = avatarAsset();
  const a = createCoastAvatar(defaultAvatar, asset);
  const b = createCoastAvatar(defaultAvatar, asset);
  const mesh = (root: THREE.Object3D) => {
    let result!: THREE.SkinnedMesh;
    root.traverse((n) => {
      if (n instanceof THREE.SkinnedMesh) result = n;
    });
    return result;
  };
  const am = mesh(a.root),
    bm = mesh(b.root),
    source = mesh(asset.scene);
  assert.notEqual(am.skeleton, bm.skeleton);
  assert.notEqual(am.skeleton.bones[0], bm.skeleton.bones[0]);
  assert.equal(am.geometry, bm.geometry);
  a.dress({ ...defaultAvatar, coat: "coral" });
  assert.notEqual(
    (am.material as THREE.MeshStandardMaterial).color.getHex(),
    (bm.material as THREE.MeshStandardMaterial).color.getHex(),
  );
  assert.equal(
    (source.material as THREE.MeshStandardMaterial).color.getHexString(),
    "78a793",
  );
  a.update(0.4, "wave", false); // A photo clone must pose on its very first frame.
  b.update(0.4, "idle", false);
  assert.ok(am.skeleton.bones[0].position.y > 0.3);
  assert.equal(bm.skeleton.bones[0].position.y, 0);
  let freedGeometry = 0,
    freedMaterial = 0;
  am.geometry.addEventListener("dispose", () => freedGeometry++);
  (am.material as THREE.Material).addEventListener(
    "dispose",
    () => freedMaterial++,
  );
  a.dispose();
  a.dispose();
  assert.equal(freedGeometry, 0);
  assert.equal(freedMaterial, 1);
  b.update(0.5, "run", false);
  b.update(0.6, "run", false);
  assert.ok(bm.skeleton.bones[0].position.y > 0);
  for (const pose of ["idle", "walk", "run", "sit", "wave", "jump"] as const) {
    b.update(1, pose, true);
    b.root.traverse((node) =>
      assert.ok(node.matrixWorld.elements.every(Number.isFinite)),
    );
  }
  b.dispose();
});

test("concurrent asset leases share a load and release shared resources only after the last owner", async () => {
  const asset = avatarAsset();
  let loads = 0,
    freed = 0;
  (asset.scene.children[0] as THREE.Mesh).geometry.addEventListener(
    "dispose",
    () => freed++,
  );
  const acquire = createAvatarAssetCache(async () => {
    loads++;
    return asset;
  });
  const [a, b] = await Promise.all([acquire(), acquire()]);
  assert.equal(loads, 1);
  a.release();
  a.release();
  assert.equal(freed, 0);
  b.release();
  assert.equal(freed, 1);
  const c = await acquire();
  assert.equal(loads, 2);
  c.release();
});

test("a failed model request can be retried", async () => {
  let attempts = 0;
  const acquire = createAvatarAssetCache(async () => {
    if (++attempts === 1) throw new Error("offline");
    return avatarAsset();
  });
  await assert.rejects(acquire(), /offline/);
  const lease = await acquire();
  assert.equal(attempts, 2);
  lease.release();
});
