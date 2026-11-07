import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const COAST_AVATAR_URL = "/models/avatars/cozy-avatar-v1.glb";
export const avatarClipNames = [
  "Idle",
  "Walk",
  "Run",
  "Jump",
  "Sit",
  "Wave",
] as const;
export type CoastAvatarAsset = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

function disposeAsset(asset: CoastAvatarAsset) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  asset.scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    geometries.add(node.geometry);
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
    for (const material of Array.isArray(node.material)
      ? node.material
      : [node.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  skeletons.forEach((skeleton) => skeleton.dispose());
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
}

/** A scene owns one lease; players share geometry/textures, never bones/materials. */
export function createAvatarAssetCache(load: () => Promise<CoastAvatarAsset>) {
  let cached:
    { promise: Promise<CoastAvatarAsset>; references: number } | undefined;
  return async () => {
    const entry = (cached ??= {
      promise: Promise.resolve().then(load),
      references: 0,
    });
    entry.references++;
    let asset: CoastAvatarAsset;
    try {
      asset = await entry.promise;
    } catch (error) {
      entry.references--;
      if (cached === entry) cached = undefined;
      throw error;
    }
    let released = false;
    return {
      asset,
      release() {
        if (released) return;
        released = true;
        if (--entry.references === 0) {
          if (cached === entry) cached = undefined;
          disposeAsset(asset);
        }
      },
    };
  };
}

export const acquireCoastAvatarAsset = createAvatarAssetCache(async () => {
  const asset = await new GLTFLoader().loadAsync(COAST_AVATAR_URL);
  if (
    avatarClipNames.some(
      (name) => !asset.animations.some((clip) => clip.name === name),
    )
  ) {
    disposeAsset(asset);
    throw new Error("Coast avatar is missing required animation clips");
  }
  return asset;
});
