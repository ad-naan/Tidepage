import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  avatarColors,
  type CoastAvatar,
  type AvatarPose,
} from "../domain/coast-avatar";
import type { CoastAvatarAsset } from "./coastAvatarAsset";

/** Instances use the reviewed Blender asset, with isolated animation and tint. */
export function createCoastAvatar(
  appearance: CoastAvatar,
  asset: CoastAvatarAsset,
) {
  const root = new THREE.Group();
  root.name = "coast-companion";
  const model = clone(asset.scene);
  root.add(model);
  const materials = new Map<THREE.Material, THREE.Material>();
  const skeletons = new Set<THREE.Skeleton>();
  const shirts: THREE.MeshStandardMaterial[] = [];
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node instanceof THREE.SkinnedMesh) {
      skeletons.add(node.skeleton);
      // Animation extends limbs beyond the exported rest-pose bounds.
      node.frustumCulled = false;
    }
    const localMaterial = (source: THREE.Material) => {
      let material = materials.get(source);
      if (!material) {
        material = source.clone();
        materials.set(source, material);
        if (
          source.name === "Seafoam_Tailored_Fabric" &&
          material instanceof THREE.MeshStandardMaterial
        )
          shirts.push(material);
      }
      return material;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(localMaterial)
      : localMaterial(node.material);
  });
  const mixer = new THREE.AnimationMixer(model);
  const actions = new Map(
    asset.animations.map((clip) => [
      clip.name.toLowerCase(),
      mixer.clipAction(clip),
    ]),
  );
  let previousTime: number | undefined;
  let currentPose: AvatarPose | undefined;
  let active: THREE.AnimationAction | undefined;
  let disposed = false;
  function dress(next: CoastAvatar) {
    shirts.forEach((material) =>
      material.color.set(avatarColors.coat[next.coat]),
    );
  }
  dress(appearance);
  return {
    root,
    dress,
    update(time: number, pose: AvatarPose, reduced: boolean) {
      if (disposed) return;
      const first = previousTime === undefined;
      const delta = first
        ? 0
        : THREE.MathUtils.clamp(time - previousTime!, 0, 0.1);
      previousTime = time;
      if (pose !== currentPose) {
        const next = actions.get(pose)!;
        const previous = active;
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
        next.setLoop(
          pose === "jump" ? THREE.LoopOnce : THREE.LoopRepeat,
          Infinity,
        );
        next.clampWhenFinished = pose === "jump";
        next.play();
        if (first && pose !== "jump")
          next.time = time % next.getClip().duration;
        if (previous) {
          if (reduced) previous.stop();
          else previous.crossFadeTo(next, 0.16, false);
        }
        active = next;
        currentPose = pose;
      }
      if (active) {
        const calm =
          reduced && (pose === "idle" || pose === "wave" || pose === "sit");
        active.paused = calm;
        if (calm) active.time = pose === "wave" ? 0.4 : 0;
      }
      mixer.update(delta);
      root.updateMatrixWorld(true);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      skeletons.forEach((skeleton) => skeleton.dispose());
      materials.forEach((material) => material.dispose());
      root.removeFromParent();
      root.clear();
    },
  };
}
