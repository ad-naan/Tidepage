import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  harborCameraFrame,
  clampHarborPitch,
  harborDialogueFrame,
} from "../../src/modules/world/domain/harbor-camera";
import {
  harborCompanion,
  nearHarborCompanion,
} from "../../src/modules/world/domain/harbor-companion";
import {
  harborRoute,
  harborSpawn,
  harborWalkable,
} from "../../src/modules/world/domain/coast-harbor";
import { guideRequestSchema } from "../../src/modules/world/domain/harbor-guide";
import { createHarborCompanion } from "../../src/modules/world/runtime/createHarborCompanion";

test("dialogue framing separates the two speakers on desktop and narrow screens", () => {
  for (const width of [390, 1280]) {
    for (const angle of [0, 0.7, 1.5, 3, 4.6]) {
      const otter = new THREE.Vector3(-3.4, 0.49, 1.2);
      const player = otter
        .clone()
        .add(
          new THREE.Vector3(Math.sin(angle) * 1.7, 0, Math.cos(angle) * 1.7),
        );
      const frame = harborDialogueFrame(
        player,
        otter,
        { x: 5, y: 5, z: 12 },
        width < 600,
        false,
      );
      const camera = new THREE.PerspectiveCamera(48, width / 800, 0.1, 20000);
      camera.position.set(frame.position.x, frame.position.y, frame.position.z);
      camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
      camera.updateMatrixWorld();
      const a = player.clone().project(camera),
        b = otter.clone().project(camera);
      assert.ok(
        (Math.abs(a.x - b.x) * width) / 2 > 100,
        "speakers overlap in projection",
      );
      assert.ok(Math.abs(a.x) < 0.85 && Math.abs(b.x) < 0.85);
    }
  }
});

test("sky look reaches near zenith without lowering the camera through terrain", () => {
  const pivot = { x: 75, y: 1.6, z: -46 };
  for (const pitch of [-1.4, -0.85, 0, 0.3, 1.35]) {
    const frame = harborCameraFrame(pivot, 0.28, pitch, 14);
    assert.ok(frame.position.y >= pivot.y);
    assert.ok(Object.values(frame.position).every(Number.isFinite));
    assert.ok(Object.values(frame.target).every(Number.isFinite));
    const angle = Math.atan2(
      frame.target.y - frame.position.y,
      Math.hypot(
        frame.target.x - frame.position.x,
        frame.target.z - frame.position.z,
      ),
    );
    assert.ok(
      Math.abs(angle + (pitch < 0 ? pitch : Math.max(0.04, pitch))) < 0.001,
    );
  }
  assert.equal(clampHarborPitch(-100), -1.4);
  assert.equal(clampHarborPitch(100), 1.35);
});

test("three-person framing keeps the turtle beside the otter instead of behind it", () => {
  const actors = [
    new THREE.Vector3(0, 0.49, 0),
    new THREE.Vector3(-1.7, 0.49, 0),
    new THREE.Vector3(-1.45, 0.49, 1.6),
  ];
  const frame = harborDialogueFrame(
    actors[0],
    actors[1],
    { x: 2, y: 4, z: 7 },
    true,
    false,
    actors[2],
  );
  const camera = new THREE.PerspectiveCamera(48, 390 / 844, 0.1, 20000);
  camera.position.set(frame.position.x, frame.position.y, frame.position.z);
  camera.lookAt(frame.target.x, frame.target.y, frame.target.z);
  camera.updateMatrixWorld();
  const projected = actors.map((p) => p.clone().project(camera));
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      assert.ok((Math.abs(projected[i].x - projected[j].x) * 390) / 2 > 70);
});

test("the otter can be reached on foot from spawn and is only nearby locally", () => {
  const route = harborRoute(harborSpawn, harborCompanion.approach);
  assert.ok(route.length > 0);
  assert.ok(route.every((p) => harborWalkable(p.x, p.z)));
  assert.ok(nearHarborCompanion(harborCompanion.approach));
  assert.equal(nearHarborCompanion({ x: 76, z: -46 }), false);
});

test("dialogue accepts scene context, fixes AI identity, and bounds history", () => {
  const input = {
    locale: "zh-CN",
    place: "beach",
    question: "Look at the stars with me",
    turns: [],
  };
  assert.equal(guideRequestSchema.parse(input).companionId, "otter");
  assert.ok(
    guideRequestSchema.safeParse({ ...input, context: { night: true } })
      .success,
  );
  assert.equal(
    guideRequestSchema.safeParse({ ...input, companionId: "player" }).success,
    false,
  );
  assert.equal(
    guideRequestSchema.safeParse({
      ...input,
      context: { night: true, secret: "data" },
    }).success,
    false,
  );
  assert.equal(
    guideRequestSchema.safeParse({
      ...input,
      turns: Array(4).fill({ question: "Hi", reply: "Hello" }),
    }).success,
    false,
  );
});

test("the scene companion stays finite and disposes its GPU resources", () => {
  const scene = new THREE.Scene();
  const otter = createHarborCompanion(scene);
  const geometries = new Set<THREE.BufferGeometry>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) geometries.add(object.geometry);
  });
  let disposed = 0;
  geometries.forEach((g) => g.addEventListener("dispose", () => disposed++));
  otter.update(20, new THREE.Vector3(-2, 0, 3), true, true);
  assert.equal(otter.root.scale.y, 1);
  scene.updateMatrixWorld(true);
  scene.traverse((object) =>
    assert.ok(object.matrixWorld.elements.every(Number.isFinite)),
  );
  otter.dispose();
  assert.equal(disposed, geometries.size);
  assert.equal(scene.children.length, 0);
});
