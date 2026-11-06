import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createCoastAvatar } from "../src/modules/world/runtime/createCoastAvatar";
import {
  defaultAvatar,
  type CoastAvatar,
  type AvatarPose,
} from "../src/modules/world/domain/coast-avatar";

// GLTFExporter uses the browser FileReader API for the final binary Blob.
class BlobReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    void blob.arrayBuffer().then((value) => {
      this.result = value;
      this.onloadend?.();
    });
  }
}
Object.defineProperty(globalThis, "FileReader", {
  value: BlobReader,
  configurable: true,
});

const output = path.resolve("artifacts/coast-models");
await mkdir(output, { recursive: true });
const variants: { name: string; appearance: CoastAvatar }[] = [
  { name: "sea-traveler", appearance: defaultAvatar },
  {
    name: "coral-traveler",
    appearance: {
      ...defaultAvatar,
      coat: "coral",
      skin: "light",
      hairStyle: "bob",
      accessory: "scarf",
    },
  },
  {
    name: "oat-traveler",
    appearance: {
      ...defaultAvatar,
      coat: "cream",
      skin: "deep",
      hairStyle: "crop",
      hairColor: "ink",
      accessory: "none",
    },
  },
];
const report = [];
for (const variant of variants) {
  const model = createCoastAvatar(variant.appearance);
  const nodes = [
    "body",
    "head",
    "left-arm",
    "right-arm",
    "left-forearm",
    "right-forearm",
    "left-thigh",
    "right-thigh",
    "left-shin",
    "right-shin",
  ].map((name) => model.root.getObjectByName(name)!);
  const clips = (["idle", "walk", "wave", "sit"] as AvatarPose[]).map(
    (pose) => {
      const duration =
        pose === "walk"
          ? Math.PI / 4
          : pose === "wave"
            ? Math.PI / 2
            : pose === "idle"
              ? (Math.PI * 2) / 1.6
              : 1;
      const times: number[] = [];
      const data = nodes.map(() => ({
        positions: [] as number[],
        rotations: [] as number[],
      }));
      for (let sample = 0; sample <= 32; sample++) {
        const time = (sample / 32) * duration;
        times.push(time);
        model.update(time, pose, false);
        nodes.forEach((node, index) => {
          data[index].positions.push(...node.position.toArray());
          data[index].rotations.push(...node.quaternion.toArray());
        });
      }
      return new THREE.AnimationClip(
        pose,
        duration,
        nodes.flatMap((node, index) => [
          new THREE.VectorKeyframeTrack(
            `${node.name}.position`,
            times,
            data[index].positions,
          ),
          new THREE.QuaternionKeyframeTrack(
            `${node.name}.quaternion`,
            times,
            data[index].rotations,
          ),
        ]),
      );
    },
  );
  model.update(0, "idle", true);
  const binary = await new GLTFExporter().parseAsync(model.root, {
    binary: true,
    onlyVisible: true,
    animations: clips,
  });
  if (!(binary instanceof ArrayBuffer))
    throw new Error("Expected a binary glTF");
  await writeFile(
    path.join(output, `${variant.name}.glb`),
    Buffer.from(binary),
  );
  let triangles = 0,
    meshes = 0;
  model.root.traverseVisible((node) => {
    if (node instanceof THREE.Mesh) {
      meshes++;
      triangles +=
        (node.geometry.index?.count ??
          node.geometry.getAttribute("position").count) / 3;
    }
  });
  report.push({
    ...variant,
    bytes: binary.byteLength,
    triangles,
    meshes,
    animations: clips.map((clip) => clip.name),
  });
  model.dispose();
}
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    report.map(({ name, bytes, triangles, animations }) => ({
      name,
      bytes,
      triangles,
      animations,
    })),
    null,
    2,
  ),
);
