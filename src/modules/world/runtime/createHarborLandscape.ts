import * as THREE from "three";
import { loadHarborSanctuary } from "./loadHarborSanctuary";
import { createHarborMagic } from "./harborMagic";
import { createHarborModeler } from "./harborModeling";
import {
  buildHarborArchitecture,
  buildHarborBeacon,
  buildHarborSkiff,
} from "./harborArchitecture";
import {
  buildHarborNature,
  buildHarborTerrain,
  harborShorePoint,
} from "./harborNature";

/** Coastal diorama: batched static scenery and separate animated pieces. */
export function createHarborLandscape(scene: THREE.Scene) {
  const root = new THREE.Group();
  root.name = "harbor-landscape";
  scene.add(root);
  const kit = createHarborModeler();
  const land = new THREE.Group();
  land.name = "harbor-static-scenery";
  root.add(land);
  buildHarborTerrain(land, kit);
  buildHarborArchitecture(land, kit);
  buildHarborBeacon(land, kit);
  buildHarborNature(land, kit);
  kit.batch(land);
  const sanctuary =
    typeof window !== "undefined" ? loadHarborSanctuary(root, land) : null;
  const skiff = buildHarborSkiff(root, kit);
  const magic = typeof window !== "undefined" ? createHarborMagic(root) : null;
  kit.tube(
    root,
    kit.palette.rope,
    [
      new THREE.Vector3(1.2, 0.95, 7.5),
      new THREE.Vector3(1.45, 0.3, 7.6),
      new THREE.Vector3(2.04, 0.37, 6.52),
    ],
    0.018,
  );
  const foamGeometry = kit.sculptSurface(
    (u, v) => {
      const point = harborShorePoint(u * Math.PI * 2, 1.04 + v * 0.03);
      point.y = -0.148;
      return point;
    },
    160,
    2,
  );
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xe5e4ce,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const foam = new THREE.Mesh(foamGeometry, foamMaterial);
  foam.name = "tideline-foam";
  root.add(foam);
  const lights = [
    { x: 5.78, y: 2.56, z: -1.18, strength: 5.5, distance: 6 },
    { x: -6.7, y: 0.9, z: -2.65, strength: 2.8, distance: 4 },
    { x: -1.2, y: 1.56, z: 9.85, strength: 3, distance: 5 },
  ].map(({ x, y, z, strength, distance }) => {
    const light = new THREE.PointLight(0xffbd78, strength, distance, 2);
    light.position.set(x, y, z);
    root.add(light);
    return { light, strength };
  });
  let disposed = false;
  return {
    interact: (kind: "hearth" | "crystal") => {
      sanctuary?.interact(kind);
      if (kind === "crystal") magic?.resonate();
    },
    update: (
      time: number,
      night: number,
      player?: THREE.Vector3,
      reduced = false,
    ) => {
      if (player) sanctuary?.update(time, night, player, reduced);
      magic?.update(time, night, reduced);
      skiff.position.y = -0.03 + Math.sin(time * 1.1) * 0.035;
      skiff.rotation.z = Math.sin(time * 0.8) * 0.022;
      kit.palette.glass.emissiveIntensity = 0.3 + night * 1.5;
      lights.forEach(({ light, strength }) => {
        light.intensity = strength * (0.12 + night * 0.88);
      });
      foamMaterial.opacity =
        (0.11 + (Math.sin(time * 0.8) * 0.5 + 0.5) * 0.11) * (1 - night * 0.65);
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      sanctuary?.dispose();
      magic?.dispose();
      kit.dispose();
      foamGeometry.dispose();
      foamMaterial.dispose();
      lights.forEach(({ light }) => light.dispose());
      root.removeFromParent();
    },
  };
}
