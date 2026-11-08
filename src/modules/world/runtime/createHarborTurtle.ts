import * as THREE from "three";
import { createHarborModeler } from "./harborModeling";
import { harborTurtle } from "../domain/harbor-companion";

export function createHarborTurtle(scene: THREE.Scene) {
  const kit = createHarborModeler();
  const root = new THREE.Group();
  root.name = "harbor-turtle-companion";
  root.position.set(harborTurtle.position.x, 0.49, harborTurtle.position.z);
  root.rotation.y = 1.8;
  scene.add(root);
  const p = kit.palette;
  function ellipsoid(
    name: string,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const part = kit.mesh(
      root,
      name,
      new THREE.SphereGeometry(1, 20, 12),
      material,
      x,
      y,
      z,
    );
    part.scale.set(sx, sy, sz);
    return part;
  }
  ellipsoid("shell-rim", p.cream, 0, 0.22, 0, 0.66, 0.15, 0.82);
  ellipsoid("domed-shell", p.pine, 0, 0.34, 0, 0.63, 0.4, 0.79);
  ellipsoid("head", p.moss, 0, 0.34, 0.91, 0.25, 0.23, 0.3);
  ellipsoid("muzzle", p.moss, 0, 0.27, 1.1, 0.21, 0.11, 0.18);
  for (const side of [-1, 1]) {
    ellipsoid("eye", p.dark, side * 0.18, 0.44, 1.08, 0.032, 0.038, 0.025);
    const front = ellipsoid(
      "front-flipper",
      p.moss,
      side * 0.67,
      0.12,
      0.37,
      0.43,
      0.08,
      0.2,
    );
    front.rotation.y = side * -0.5;
    ellipsoid(
      "back-flipper",
      p.moss,
      side * 0.48,
      0.1,
      -0.61,
      0.28,
      0.07,
      0.16,
    );
  }
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const patch = kit.mesh(
      root,
      "shell-scute",
      new THREE.CylinderGeometry(0.2, 0.22, 0.04, 6),
      p.leaf,
      Math.cos(angle) * 0.31,
      0.66,
      Math.sin(angle) * 0.4,
    );
    patch.rotation.z = -Math.cos(angle) * 0.36;
    patch.rotation.x = Math.sin(angle) * 0.3;
  }
  kit.mesh(
    root,
    "shell-center",
    new THREE.CylinderGeometry(0.23, 0.23, 0.045, 6),
    p.moss,
    0,
    0.735,
    0,
  );
  kit.batch(root);
  return {
    root,
    update(
      time: number,
      target: THREE.Vector3,
      listening: boolean,
      reduced: boolean,
    ) {
      root.scale.y = reduced ? 1 : 1 + Math.sin(time * 1.2) * 0.018;
      if (listening)
        root.rotation.y = Math.atan2(
          target.x - root.position.x,
          target.z - root.position.z,
        );
    },
    dispose() {
      kit.dispose();
      root.removeFromParent();
    },
  };
}
