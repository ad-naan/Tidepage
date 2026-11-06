import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function createHarborLandscape(scene: THREE.Scene) {
  const root = new THREE.Group();
  scene.add(root);
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const mat = (color: number, emissive = false) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.65 } : {}),
    });
    materials.push(material);
    return material;
  };
  const sand = mat(0xe4cba1),
    earth = mat(0xb9a686),
    grass = mat(0x87966a);
  const wood = mat(0x8b6b51),
    paleWood = mat(0xb89b75),
    dark = mat(0x394e50);
  const plaster = mat(0xf0e1c4),
    roof = mat(0x667f7b),
    rock = mat(0x8e9990);
  const green = mat(0x617e65),
    leaf = mat(0x90a17a),
    pink = mat(0xceab99);
  const glass = mat(0xffcf89, true),
    white = mat(0xf0e6d2);
  const add = (
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const box = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) =>
    add(
      parent,
      new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.12),
      material,
      x,
      y,
      z,
    );
  const oval = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) => {
    const mesh = add(
      parent,
      new THREE.IcosahedronGeometry(1, 1),
      material,
      x,
      y,
      z,
    );
    mesh.scale.set(w, h, d);
    return mesh;
  };
  const ground = add(
    root,
    new THREE.CylinderGeometry(10, 10.3, 0.65, 64),
    earth,
    0,
    0,
    -1,
  );
  ground.scale.z = 0.72;
  const beach = add(
    root,
    new THREE.CylinderGeometry(10, 10, 0.1, 64),
    sand,
    0,
    0.37,
    -1,
  );
  beach.scale.z = 0.72;
  const lawn = add(
    root,
    new THREE.CylinderGeometry(7.2, 7.3, 0.025, 48),
    grass,
    0.3,
    0.435,
    -3.8,
  );
  lawn.scale.z = 0.5;
  // A continuous boardwalk joins the beach to the arrival pier.
  for (let i = 0; i < 28; i++)
    box(
      root,
      i % 3 ? paleWood : wood,
      0,
      0.48,
      3.25 + i * 0.25,
      2.3,
      0.12,
      0.23,
    );
  for (const x of [-1.15, 1.15]) {
    for (const z of [5.3, 7.5, 9.8]) {
      box(root, wood, x, 0.42, z, 0.14, 1.65, 0.14);
      box(root, plaster, x, 1.28, z, 0.17, 0.09, 0.17);
    }
    box(root, paleWood, x, 1.02, 7.5, 0.065, 0.065, 4.7);
  }
  // Low skiff moored beside the pier.
  const skiff = new THREE.Group();
  skiff.position.set(2.15, 0.06, 8);
  skiff.rotation.y = 0.12;
  root.add(skiff);
  oval(skiff, wood, 0, 0, 0, 0.65, 0.23, 1.55);
  oval(skiff, dark, 0, 0.13, 0, 0.51, 0.12, 1.23);
  for (const z of [-0.6, 0.35])
    box(skiff, paleWood, 0, 0.22, z, 1.02, 0.07, 0.2);
  const oar = box(skiff, paleWood, 0, 0.3, 0, 0.065, 0.055, 2.8);
  oar.rotation.y = -0.45;

  const cottage = new THREE.Group();
  cottage.position.set(4, 0.46, -3.3);
  root.add(cottage);
  box(cottage, rock, 0, 0.1, 0, 5.25, 0.23, 4.6);
  box(cottage, plaster, 0, 1.55, 0, 4.8, 2.8, 3.9);
  for (const side of [-1, 1]) {
    const slope = box(cottage, roof, side * 1.32, 3.4, 0, 3.15, 0.19, 4.6);
    slope.rotation.z = -side * 0.48;
    box(cottage, wood, side * 2.36, 1.53, 1.98, 0.14, 2.9, 0.12);
  }
  // Gabled front, warm window and a recessed door.
  const gable = new THREE.Shape();
  gable.moveTo(-2.4, 2.94);
  gable.lineTo(0, 4.16);
  gable.lineTo(2.4, 2.94);
  gable.closePath();
  add(cottage, new THREE.ShapeGeometry(gable), plaster, 0, 0, 1.96);
  box(cottage, wood, 0.55, 1.04, 2.02, 1.02, 2.05, 0.15);
  box(cottage, glass, 0.55, 1.55, 2.11, 0.58, 0.65, 0.025);
  oval(cottage, paleWood, 0.88, 1, 2.12, 0.045, 0.045, 0.04);
  box(cottage, wood, -1.15, 1.65, 2.04, 1.25, 1.3, 0.15);
  box(cottage, glass, -1.15, 1.65, 2.13, 1.06, 1.1, 0.03);
  box(cottage, plaster, -1.15, 1.65, 2.16, 0.07, 1.15, 0.04);
  box(cottage, plaster, -1.15, 1.65, 2.16, 1.12, 0.07, 0.04);
  box(cottage, wood, -1.15, 0.94, 2.18, 1.4, 0.15, 0.42);
  for (const x of [-1.6, -1.25, -0.9, -0.6]) {
    oval(cottage, green, x, 1.13, 2.22, 0.18, 0.16, 0.18);
    oval(cottage, pink, x, 1.25, 2.23, 0.075, 0.08, 0.075);
  }
  box(cottage, wood, 1.35, 3.75, -0.8, 0.53, 1.45, 0.6);
  box(cottage, dark, 1.35, 4.5, -0.8, 0.68, 0.12, 0.74);
  for (let i = 0; i < 4; i++)
    box(root, paleWood, 4.55, 0.46, -0.7 + i * 0.42, 1.3, 0.05, 0.28);
  // Letterbox: the host's presence is represented by the house, never a fake player.
  box(root, wood, 6.7, 1.05, -0.25, 0.12, 1.25, 0.12);
  box(root, roof, 6.7, 1.65, -0.25, 0.64, 0.45, 0.48);
  box(root, dark, 6.7, 1.7, 0.005, 0.4, 0.045, 0.02);
  // Bench positioned for the local sit animation, facing the water.
  for (const x of [-6.25, -3.75]) {
    for (const z of [-2.75, -2.15]) box(root, dark, x, 0.7, z, 0.08, 0.6, 0.08);
    box(root, dark, x, 1.25, -2.8, 0.08, 1.2, 0.08);
  }
  for (let i = 0; i < 4; i++)
    box(root, wood, -5, 1, -2.8 + i * 0.23, 3.05, 0.11, 0.2);
  for (const y of [1.35, 1.65])
    box(root, paleWood, -5, y, -2.86, 3.05, 0.2, 0.1);
  // A picnic cloth and a closed journal make the beach feel lived in.
  box(root, plaster, -4.6, 0.45, 3.5, 2.4, 0.025, 1.8);
  for (const x of [-5.5, -4.9, -4.3, -3.7])
    box(root, pink, x, 0.467, 3.5, 0.17, 0.007, 1.8);
  box(root, roof, -4.8, 0.51, 3.8, 0.38, 0.08, 0.5);
  box(root, white, -4.8, 0.515, 3.8, 0.33, 0.04, 0.45);
  oval(root, wood, -4, 0.64, 3.9, 0.16, 0.2, 0.16);
  // Deterministic vegetation, shells and rocks: identical in every future room.
  for (let i = 0; i < 25; i++) {
    const angle = i * 2.39996;
    const x = Math.cos(angle) * (9.4 + Math.sin(i * 5) * 0.35);
    const z = -1 + Math.sin(angle) * 6.6;
    if (z > 4.7 && Math.abs(x) < 2) continue;
    oval(
      root,
      rock,
      x,
      0.2,
      z,
      0.35 + (i % 3) * 0.18,
      0.25 + (i % 4) * 0.1,
      0.4,
    );
  }
  for (const [x, z, scale] of [
    [-8, -3.6, 1],
    [-7.2, -4.8, 0.85],
    [-2.5, -6.6, 1.2],
    [0.4, -7, 1],
    [8, -4.5, 0.8],
  ]) {
    box(root, wood, x, 1.4, z, 0.25, 2.2, 0.25);
    for (let j = 0; j < 3; j++) {
      const canopy = add(
        root,
        new THREE.ConeGeometry((1.2 - j * 0.23) * scale, 1.8 * scale, 7),
        j % 2 ? leaf : green,
        x,
        2 + j * 0.75,
        z,
      );
      canopy.rotation.y = j * 0.65;
    }
  }
  for (let i = 0; i < 50; i++) {
    const x = Math.sin(i * 17.2) * 8.4;
    const z = -4.6 + Math.cos(i * 9.7) * 1.9;
    if (x > 0.8 && x < 7) continue;
    const stem = add(
      root,
      new THREE.ConeGeometry(0.07, 0.32 + (i % 3) * 0.08, 3),
      i % 3 ? green : leaf,
      x,
      0.61,
      z,
    );
    stem.rotation.z = Math.sin(i) * 0.3;
  }
  for (let i = 0; i < 15; i++)
    oval(
      root,
      white,
      Math.sin(i * 12) * 6.7,
      0.45,
      1.3 + Math.cos(i * 4) * 2.5,
      0.06,
      0.025,
      0.09,
    );

  // A small lighthouse island creates depth without expanding the walkable area.
  const beacon = new THREE.Group();
  beacon.position.set(-18, 0, -24);
  root.add(beacon);
  oval(beacon, rock, 0, -0.4, 0, 5, 0.8, 3.6);
  const base = add(
    beacon,
    new THREE.CylinderGeometry(3.5, 4, 0.4, 18),
    grass,
    0,
    0,
    0,
  );
  base.scale.z = 0.8;
  add(
    beacon,
    new THREE.CylinderGeometry(0.75, 1.15, 6.5, 20),
    plaster,
    0,
    3.3,
    0,
  );
  for (const y of [2, 4]) box(beacon, dark, 0, y, 0.9, 0.27, 0.55, 0.05);
  add(beacon, new THREE.CylinderGeometry(1.3, 1.3, 0.17, 20), dark, 0, 6.6, 0);
  add(beacon, new THREE.CylinderGeometry(0.8, 0.8, 1.05, 12), glass, 0, 7.2, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    box(
      beacon,
      dark,
      Math.cos(a) * 0.83,
      7.2,
      Math.sin(a) * 0.83,
      0.07,
      1.1,
      0.07,
    );
  }
  add(beacon, new THREE.ConeGeometry(1.3, 0.8, 12), roof, 0, 8.1, 0);
  for (let i = 0; i < 7; i++)
    oval(
      root,
      i % 2 ? rock : roof,
      -65 + i * 22,
      -2.7,
      -95 - Math.sin(i) * 12,
      18,
      5 + (i % 3),
      8,
    );
  const porchLight = new THREE.PointLight(0xffc985, 7, 9, 2);
  porchLight.position.set(4.5, 2.8, -0.8);
  root.add(porchLight);
  return {
    update: (time: number, night: number) => {
      skiff.position.y = 0.06 + Math.sin(time * 1.1) * 0.035;
      skiff.rotation.z = Math.sin(time * 0.8) * 0.025;
      glass.emissiveIntensity = 0.55 + night * 1.6;
      porchLight.intensity = 2 + night * 10;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
}
