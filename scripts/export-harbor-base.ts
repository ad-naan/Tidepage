import { writeFile, mkdir } from "node:fs/promises";
import * as THREE from "three";
import { harborTrees } from "../src/modules/world/domain/coast-harbor";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { createHarborModeler } from "../src/modules/world/runtime/harborModeling";
import { buildHarborArchitecture } from "../src/modules/world/runtime/harborArchitecture";
import {
  buildHarborNature,
  buildHarborTerrain,
} from "../src/modules/world/runtime/harborNature";

class BlobReader {
  result: ArrayBuffer | null = null;
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
const root = new THREE.Group();
const kit = createHarborModeler();
buildHarborTerrain(root, kit);
buildHarborArchitecture(root, kit, false);
buildHarborNature(root, kit, false);
Object.values(kit.palette).forEach((material) => {
  material.map = null;
});
kit.batch(root);
const data = await new GLTFExporter().parseAsync(root, { binary: true });
await mkdir("artifacts/fantasy-harbor", { recursive: true });
await writeFile("artifacts/fantasy-harbor/tree-layout.json", JSON.stringify(harborTrees));
await writeFile(
  "artifacts/fantasy-harbor/harbor-base.glb",
  Buffer.from(data as ArrayBuffer),
);
kit.dispose();
console.info(
  "Exported terrain, pier and shared furniture for Blender authoring.",
);
