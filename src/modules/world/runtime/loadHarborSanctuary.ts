import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { harborInside } from "../domain/coast-harbor";

export function disposeHarborAsset(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  root.removeFromParent();
}

/** Blender owns the authored forms; animation and interactions stay in the runtime. */
export function loadHarborSanctuary(root: THREE.Group, fallback: THREE.Group) {
  let asset: THREE.Group | null = null;
  let door: THREE.Object3D | undefined,
    roof: THREE.Object3D | undefined,
    shell: THREE.Object3D | undefined,
    hearth: THREE.Object3D | undefined;
  let disposed = false,
    warm = true,
    resonating = false,
    lastTime = 0,
    angle = 0;
  const emissive: THREE.MeshStandardMaterial[] = [];
  const ready = new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .loadAsync("/models/tidal-sanctuary.glb")
    .then((gltf) => {
      if (disposed) {
        disposeHarborAsset(gltf.scene);
        return;
      }
      asset = gltf.scene;
      asset.name = "blender-tidal-sanctuary";
      asset.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.castShadow = node.receiveShadow = true;
        for (const material of Array.isArray(node.material)
          ? node.material
          : [node.material])
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.emissiveIntensity > 0 &&
            !emissive.includes(material)
          )
            emissive.push(material);
      });
      door = asset.getObjectByName("harbor_door");
      roof = asset.getObjectByName("harbor_house_roof");
      shell = asset.getObjectByName("harbor_house_shell");
      hearth = asset.getObjectByName("harbor_hearth");
      root.add(asset);
      fallback.visible = false;
    })
    .catch(() => {
      fallback.visible = true;
    });
  return {
    ready,
    get loaded() {
      return asset !== null;
    },
    interact: (kind: "hearth" | "crystal") => {
      if (kind === "hearth") warm = !warm;
      else resonating = !resonating;
    },
    update: (
      time: number,
      night: number,
      player: THREE.Vector3,
      reduced: boolean,
    ) => {
      const delta = Math.max(0, Math.min(time - lastTime, 0.1));
      lastTime = time;
      const inside = harborInside(player.x, player.z);
      const nearDoor = Math.hypot(player.x - 4.5, player.z + 1.24) < 2.3;
      angle = THREE.MathUtils.damp(
        angle,
        nearDoor || inside ? -1.5 : 0,
        5,
        reduced ? 1 : delta,
      );
      if (door) door.rotation.y = angle;
      if (roof) roof.visible = !inside;
      if (shell) shell.visible = !inside;
      if (hearth) hearth.visible = warm;
      for (const material of emissive) {
        if (material.name === "tidal-crystal-light")
          material.emissiveIntensity = resonating ? 2 : 0.6 + night * 0.5;
        else if (material.name.includes("leaf"))
          material.emissiveIntensity = 0.08 + night * 0.23;
        else if (material.name === "seed-lantern-light")
          material.emissiveIntensity = 0.6 + night * 1.2;
      }
    },
    dispose: () => {
      disposed = true;
      if (asset) disposeHarborAsset(asset);
    },
  };
}
