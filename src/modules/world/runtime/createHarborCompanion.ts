import * as THREE from "three";
import { createHarborModeler } from "./harborModeling";
import { harborCompanion } from "../domain/harbor-companion";

/** The harbor otter reuses the original voyage's silhouette and coastal materials. */
export function createHarborCompanion(scene: THREE.Scene) {
  const kit = createHarborModeler();
  const root = new THREE.Group();
  root.name = "harbor-otter-companion";
  root.position.set(
    harborCompanion.position.x,
    0.49,
    harborCompanion.position.z,
  );
  root.rotation.y = 0.5;
  scene.add(root);
  const { palette: p } = kit;
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const ellipsoid = (
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material,
  ) => {
    const part = kit.mesh(
      root,
      "otter-detail",
      sphere.clone(),
      material,
      x,
      y,
      z,
    );
    part.scale.set(sx, sy, sz);
    return part;
  };
  ellipsoid(0, 0.35, 0, 0.43, 0.38, 0.7, p.wood);
  ellipsoid(0, 0.62, 0.49, 0.38, 0.3, 0.33, p.wood);
  ellipsoid(0, 0.53, 0.75, 0.27, 0.15, 0.12, p.cream);
  ellipsoid(0, 0.62, 0.84, 0.07, 0.05, 0.04, p.dark);
  for (const side of [-1, 1]) {
    ellipsoid(side * 0.3, 0.79, 0.42, 0.085, 0.09, 0.075, p.wood);
    ellipsoid(side * 0.19, 0.71, 0.74, 0.028, 0.032, 0.024, p.dark);
    ellipsoid(side * 0.32, 0.12, 0.3, 0.14, 0.09, 0.22, p.wood);
    ellipsoid(side * 0.22, 0.29, 0.59, 0.13, 0.11, 0.18, p.wood);
    for (let i = 0; i < 3; i++)
      kit.tube(
        root,
        p.cream,
        [
          new THREE.Vector3(side * 0.17, 0.53 + i * 0.035, 0.81),
          new THREE.Vector3(side * 0.5, 0.55 + i * 0.075, 0.85),
        ],
        0.006,
        4,
      );
  }
  const tail = kit.mesh(
    root,
    "otter-tail",
    new THREE.ConeGeometry(0.24, 1.4, 12),
    p.wood,
    0,
    0.18,
    -1.1,
  );
  tail.rotation.x = -Math.PI / 2;
  kit.batch(root);
  sphere.dispose();
  return {
    root,
    update(
      time: number,
      player: THREE.Vector3,
      talking: boolean,
      reduced: boolean,
    ) {
      root.scale.y = reduced
        ? 1
        : 1 + Math.sin(time * 1.6) * (talking ? 0.035 : 0.015);
      if (talking)
        root.rotation.y = Math.atan2(
          player.x - root.position.x,
          player.z - root.position.z,
        );
    },
    dispose() {
      kit.dispose();
      root.removeFromParent();
    },
  };
}
