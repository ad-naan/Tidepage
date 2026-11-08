import * as THREE from "three";
import { v3, type HarborModeler } from "./harborModeling";

export function buildHarborArchitecture(
  parent: THREE.Group,
  kit: HarborModeler,
  includeCottage = true,
) {
  const { palette: p, box, beam, tube, mesh, pebble, lathe } = kit;
  const cottage = new THREE.Group();
  cottage.name = "sea-house";
  cottage.position.set(4, 0.46, -3.3);
  parent.add(cottage);
  // Hollow walls and a real opening match the authoritative doorway.
  box(cottage, p.plaster, -2.3, 1.5, 0, 0.2, 3, 3.9);
  box(cottage, p.plaster, 2.3, 1.5, 0, 0.2, 3, 3.9);
  box(cottage, p.plaster, 0, 1.5, -1.95, 4.8, 3, 0.2);
  box(cottage, p.plaster, -1.2, 1.5, 1.95, 2.4, 3, 0.2);
  box(cottage, p.plaster, 1.7, 1.5, 1.95, 1.4, 3, 0.2);
  box(cottage, p.plaster, 0.5, 2.65, 1.95, 1, 0.7, 0.2);
  box(cottage, p.paleWood, 0, 0, 0, 4.4, 0.06, 3.8);
  const canopy = new THREE.Group();
  canopy.name = "sea-house-canopy";
  cottage.add(canopy);
  const outline = new THREE.Shape();
  outline.moveTo(-2.4, 2.93);
  outline.lineTo(2.4, 2.93);
  outline.lineTo(0, 4.2);
  outline.closePath();
  for (const z of [-1.95, 1.85])
    mesh(
      canopy,
      "gable",
      new THREE.ExtrudeGeometry(outline, { depth: 0.1, bevelEnabled: false }),
      p.plaster,
      0,
      0,
      z,
    );
  for (let i = 0; i < 12; i++) {
    const stone = box(
      cottage,
      i % 3 ? p.rock : p.rockLight,
      -2.25 + i * 0.41,
      0.13,
      2.02,
      0.39,
      0.25,
      0.35,
    );
    stone.rotation.z = Math.sin(i * 3) * 0.035;
  }
  box(cottage, p.rock, 0, 0.08, 0, 5.1, 0.18, 4.35);
  for (const side of [-1, 1]) {
    const roof = new THREE.Group();
    roof.position.set(side * 1.3, 3.56, 0);
    roof.rotation.z = -side * 0.486;
    canopy.add(roof);
    box(roof, p.wood, 0, -0.05, 0, 3.06, 0.16, 4.7);
    // Overlapping cedar shingles carry the silhouette down to the drip edge.
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 11; col++) {
        box(
          roof,
          (row + col) % 4 ? p.roof : p.roofLight,
          -1.36 + row * 0.45,
          0.056 + row * 0.003,
          -2.13 + col * 0.426,
          0.5,
          0.065,
          0.407,
        );
      }
    box(roof, p.paleWood, 0, 0, 2.4, 3.25, 0.2, 0.14);
    box(roof, p.paleWood, 0, 0, -2.4, 3.25, 0.2, 0.14);
    for (const z of [-1.8, -0.9, 0, 0.9, 1.8])
      box(roof, p.wood, 0, -0.17, z, 3.24, 0.12, 0.1);
    box(cottage, p.wood, side * 2.37, 1.6, 2.0, 0.13, 2.85, 0.14);
    beam(
      cottage,
      p.wood,
      v3(0, 4.18, 2.03),
      v3(side * 2.36, 2.94, 2.03),
      0.065,
    );
  }
  box(canopy, p.roof, 0, 4.29, 0, 0.18, 0.13, 4.85);
  box(cottage, p.wood, 0, 2.92, 2.025, 4.8, 0.12, 0.12);
  beam(cottage, p.wood, v3(0, 2.95, 2.04), v3(0, 4.17, 2.04), 0.045);
  // Circular attic window, deep jamb, four mullions and a projecting sill.
  const attic = mesh(
    cottage,
    "attic-window-jamb",
    new THREE.TorusGeometry(0.32, 0.055, 8, 24),
    p.wood,
    0,
    3.38,
    2.03,
  );
  attic.rotation.z = Math.PI / 4;
  const pane = mesh(
    cottage,
    "attic-amber-pane",
    new THREE.CircleGeometry(0.28, 24),
    p.glass,
    0,
    3.38,
    2.045,
  );
  pane.castShadow = false;
  box(cottage, p.cream, 0, 3.38, 2.06, 0.035, 0.56, 0.035);
  box(cottage, p.cream, 0, 3.38, 2.06, 0.56, 0.035, 0.035);
  // The door rests open against the outside wall, leaving a visible passage.
  const openDoor = box(cottage, p.roof, 1.16, 1.1, 2.46, 0.1, 2.1, 0.95);
  openDoor.name = "open-sea-house-door";
  // Furniture uses the same footprints as the movement rules.
  box(cottage, p.wood, 1.65, 0.3, -0.9, 1.2, 0.5, 1.8);
  box(cottage, p.cream, 1.65, 0.62, -0.9, 1.18, 0.15, 1.75);
  box(cottage, p.wood, -1.65, 0.8, -1.1, 1.2, 0.12, 0.7);
  box(cottage, p.wood, -1.65, 0.52, -0.2, 0.65, 0.1, 0.65);
  box(cottage, p.wood, -1.95, 0.9, -0.2, 0.1, 0.75, 0.65);
  for (const x of [-1.88, -1.42])
    for (const z of [-0.43, 0.03])
      box(cottage, p.wood, x, 0.25, z, 0.06, 0.5, 0.06);
  box(cottage, p.rock, 1.65, 0.5, 1.15, 1, 1, 0.7);
  box(cottage, p.dark, 1.4, 0.45, 1.52, 0.6, 0.6, 0.03);
  const fire = box(cottage, p.glass, 1.4, 0.3, 1.55, 0.4, 0.25, 0.04);
  fire.name = "hearth-embers";
  const window = (group: THREE.Group) => {
    box(group, p.wood, 0, 0, 0, 1.35, 1.33, 0.14);
    box(group, p.glass, 0, 0, 0.08, 1.16, 1.14, 0.035);
    for (const x of [-0.29, 0.29])
      box(group, p.cream, x, 0, 0.12, 0.035, 1.16, 0.045);
    box(group, p.cream, 0, 0, 0.12, 1.18, 0.045, 0.045);
    for (const side of [-1, 1]) {
      const shutter = new THREE.Group();
      shutter.position.set(side * 0.94, 0, 0.03);
      shutter.rotation.y = side * -0.17;
      group.add(shutter);
      box(shutter, p.roof, 0, 0, 0, 0.43, 1.33, 0.075);
      for (let i = 0; i < 7; i++)
        box(shutter, p.roofLight, 0, -0.51 + i * 0.17, 0.05, 0.36, 0.07, 0.04);
    }
    box(group, p.paleWood, 0, -0.72, 0.1, 1.55, 0.14, 0.38);
    box(group, p.wood, 0, -0.91, 0.22, 1.4, 0.3, 0.37);
    for (let i = 0; i < 8; i++) {
      pebble(
        group,
        i % 2 ? p.leaf : p.pine,
        -0.6 + i * 0.17,
        -0.69,
        0.25,
        0.19,
        0.16,
        0.18,
        i,
      );
      pebble(
        group,
        i % 3 ? p.cream : p.coral,
        -0.6 + i * 0.17,
        -0.53,
        0.28,
        0.07,
        0.055,
        0.065,
        i,
      );
    }
  };
  const frontWindow = new THREE.Group();
  frontWindow.position.set(-1.16, 1.7, 2.02);
  cottage.add(frontWindow);
  window(frontWindow);
  const sideWindow = new THREE.Group();
  sideWindow.position.set(-2.42, 1.7, -0.4);
  sideWindow.rotation.y = -Math.PI / 2;
  cottage.add(sideWindow);
  window(sideWindow);
  // Sheltered front stoop stays within the existing house collision footprint.
  for (let i = 0; i < 3; i++)
    box(
      cottage,
      p.rockLight,
      0.55,
      0.05 + i * 0.045,
      2.55 - i * 0.18,
      1.65,
      0.1,
      0.25,
    );
  for (const x of [-0.3, 1.4]) {
    box(cottage, p.wood, x, 1.35, 2.52, 0.1, 2.5, 0.1);
    beam(cottage, p.paleWood, v3(x, 2.05, 2.52), v3(x, 2.59, 2.06), 0.04);
  }
  const awning = box(cottage, p.roof, 0.55, 2.67, 2.31, 2.15, 0.1, 1.07);
  awning.rotation.x = 0.18;
  for (let i = 0; i < 9; i++)
    box(cottage, p.roofLight, -0.43 + i * 0.245, 2.62, 2.8, 0.2, 0.12, 0.1);
  for (let row = 0; row < 7; row++)
    for (let col = 0; col < 2; col++)
      box(
        cottage,
        (row + col) % 3 ? p.clay : p.plaster,
        1.2 + col * 0.28,
        3.48 + row * 0.16,
        -0.72,
        0.265,
        0.15,
        0.56,
      );
  box(cottage, p.dark, 1.34, 4.62, -0.72, 0.72, 0.14, 0.78);
  // A lantern housing has a cap, base, cage and actual warm panes.
  const lantern = (
    group: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale = 1,
  ) => {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);
    lamp.scale.setScalar(scale);
    group.add(lamp);
    box(lamp, p.glass, 0, 0, 0, 0.17, 0.26, 0.17);
    for (const height of [-0.17, 0.17])
      box(lamp, p.dark, 0, height, 0, 0.26, 0.06, 0.26);
    for (const xx of [-0.105, 0.105])
      for (const zz of [-0.105, 0.105])
        box(lamp, p.dark, xx, 0, zz, 0.025, 0.3, 0.025);
    const loop = mesh(
      lamp,
      "lantern-handle",
      new THREE.TorusGeometry(0.07, 0.012, 5, 12),
      p.dark,
      0,
      0.25,
      0,
    );
    loop.rotation.y = Math.PI / 2;
  };
  lantern(cottage, 1.78, 2.1, 2.12);
  tube(
    cottage,
    p.dark,
    [v3(1.78, 2.5, 1.99), v3(1.78, 2.55, 2.22), v3(1.78, 2.35, 2.22)],
    0.022,
  );

  const dock = new THREE.Group();
  dock.name = "arrival-pier";
  parent.add(dock);
  for (const x of [-0.83, 0.83])
    box(dock, p.wood, x, 0.27, 8.15, 0.17, 0.27, 10.25);
  for (let i = 0; i < 43; i++) {
    const z = 3.03 + i * 0.236;
    const plank = box(
      dock,
      i % 5 ? p.paleWood : p.wood,
      0,
      0.43,
      z,
      2.3,
      0.12,
      0.218,
    );
    plank.rotation.y = Math.sin(i * 7) * 0.006;
    for (const x of [-0.86, 0.86])
      pebble(dock, p.dark, x, 0.497, z, 0.021, 0.008, 0.021);
  }
  for (const side of [-1, 1]) {
    for (const z of [5.2, 7.5, 9.85]) {
      mesh(
        dock,
        "pier-pile",
        new THREE.CylinderGeometry(0.105, 0.14, 2.25, 10),
        p.wood,
        side * 1.2,
        0.15,
        z,
      );
      for (const y of [0.94, 1.02, 1.1]) {
        const rope = mesh(
          dock,
          "rope-binding",
          new THREE.TorusGeometry(0.12, 0.018, 5, 12),
          p.rope,
          side * 1.2,
          y,
          z,
        );
        rope.rotation.x = Math.PI / 2;
      }
      box(dock, p.paleWood, side * 1.2, 1.31, z, 0.27, 0.07, 0.27);
    }
    for (const [a, b] of [
      [5.2, 7.5],
      [7.5, 9.85],
    ])
      tube(
        dock,
        p.rope,
        [
          v3(side * 1.2, 1.12, a),
          v3(side * 1.2, 0.88, (a + b) / 2),
          v3(side * 1.2, 1.12, b),
        ],
        0.027,
      );
    beam(
      dock,
      p.wood,
      v3(side * 1.2, -0.6, 5.2),
      v3(side * 0.83, 0.27, 6.6),
      0.065,
    );
  }
  lantern(dock, -1.2, 1.56, 9.85, 1.2);
  const ring = mesh(
    dock,
    "life-ring",
    new THREE.TorusGeometry(0.25, 0.075, 8, 28),
    p.cream,
    1.3,
    0.66,
    7.5,
  );
  ring.rotation.y = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const band = mesh(
      dock,
      "life-ring-coral-band",
      new THREE.TorusGeometry(0.252, 0.079, 8, 4, 0.27),
      p.coral,
      1.3,
      0.66,
      7.5,
    );
    band.rotation.set(0, Math.PI / 2, (i * Math.PI) / 2);
  }
  for (let i = 0; i < 4; i++) {
    const coil = mesh(
      dock,
      "mooring-rope-coil",
      new THREE.TorusGeometry(0.13 + i * 0.035, 0.017, 5, 20),
      p.rope,
      0.6,
      0.51,
      9.3,
    );
    coil.rotation.x = Math.PI / 2;
  }

  const bench = new THREE.Group();
  bench.name = "shared-bench";
  parent.add(bench);
  for (const x of [-6.25, -3.75]) {
    for (const z of [-2.75, -2.15])
      box(bench, p.dark, x, 0.7, z, 0.08, 0.6, 0.08);
    beam(bench, p.dark, v3(x, 0.5, -2.8), v3(x, 1.78, -2.96), 0.045);
    tube(
      bench,
      p.dark,
      [
        v3(x, 1, -2.2),
        v3(x, 1.32, -2.25),
        v3(x, 1.32, -2.75),
        v3(x, 1.05, -2.83),
      ],
      0.04,
    );
  }
  for (let i = 0; i < 4; i++)
    box(bench, p.wood, -5, 1, -2.8 + i * 0.23, 3.05, 0.11, 0.2);
  for (const y of [1.35, 1.62]) {
    box(bench, p.paleWood, -5, y, -2.94, 3.05, 0.21, 0.11);
    for (const x of [-6.25, -3.75])
      pebble(bench, p.brass, x, y, -2.875, 0.024, 0.024, 0.012);
  }
  lantern(bench, -6.7, 0.69, -2.65);
  box(parent, p.wood, 6.7, 1.04, -0.25, 0.1, 1.2, 0.1);
  box(parent, p.roof, 6.7, 1.65, -0.25, 0.64, 0.43, 0.48);
  box(parent, p.dark, 6.7, 1.69, 0.003, 0.4, 0.035, 0.025);
  const mailboxCap = box(
    parent,
    p.roofLight,
    6.7,
    1.91,
    -0.25,
    0.75,
    0.07,
    0.59,
  );
  mailboxCap.rotation.z = -0.06;
  // Ceramics outside the collision area are small ground dressing, not barriers.
  for (const [x, z] of [
    [1.65, -0.6],
    [6.25, -0.8],
  ]) {
    lathe(
      parent,
      p.clay,
      [
        [0, 0],
        [0.18, 0],
        [0.23, 0.3],
        [0.25, 0.33],
        [0.2, 0.35],
        [0.19, 0.29],
      ],
      x,
      0.45,
      z,
    );
    for (let i = 0; i < 5; i++)
      pebble(
        parent,
        p.leaf,
        x + Math.sin(i * 2) * 0.15,
        0.92,
        z + Math.cos(i * 2) * 0.13,
        0.16,
        0.25,
        0.12,
        i,
      );
  }
  for (const part of [...cottage.children]) {
    if (part !== canopy && part.position.y > 2.9) canopy.add(part);
  }
  if (!includeCottage) cottage.removeFromParent();
}

export function buildHarborSkiff(parent: THREE.Object3D, kit: HarborModeler) {
  const { palette: p, mesh, box, tube, sculptSurface } = kit;
  const boat = new THREE.Group();
  boat.name = "clinker-built-skiff";
  boat.position.set(2.28, -0.03, 12.5);
  boat.rotation.y = 0.15;
  parent.add(boat);
  // A U-shaped hull loft: open at the gunwale, closed along the tapered keel.
  const hull = (offset: number) =>
    sculptSurface(
      (u, v) => {
        const t = u * Math.PI;
        const length = Math.sin(v * Math.PI) ** 0.62;
        return v3(
          Math.cos(t) * (0.58 - offset) * length,
          0.32 -
            Math.sin(t) * (0.59 - offset) * length +
            (Math.abs(v - 0.5) * 2) ** 4 * 0.16,
          (v - 0.5) * 3.15,
        );
      },
      20,
      32,
    );
  // Outer and inner skins have opposite winding.
  const outer = hull(0);
  mesh(boat, "outer-hull", outer, p.roof);
  const inner = hull(0.055);
  const index = inner.getIndex()!;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  inner.computeVertexNormals();
  mesh(boat, "inner-hull", inner, p.paleWood);
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      const angle = 0.12 + row * 0.33;
      const points = Array.from({ length: 21 }, (_, i) => {
        const t = i / 20,
          shape = Math.sin(t * Math.PI) ** 0.62;
        return v3(
          side * Math.cos(angle) * 0.586 * shape,
          0.32 -
            Math.sin(angle) * 0.59 * shape +
            (Math.abs(t - 0.5) * 2) ** 4 * 0.16,
          (t - 0.5) * 3.15,
        );
      });
      tube(boat, row ? p.roofLight : p.wood, points, row ? 0.012 : 0.04, 28);
    }
  }
  for (let i = 1; i < 8; i++) {
    const t = i / 8,
      shape = Math.sin(t * Math.PI) ** 0.62;
    tube(
      boat,
      p.wood,
      Array.from({ length: 11 }, (_, j) => {
        const a = (j / 10) * Math.PI;
        return v3(
          Math.cos(a) * 0.51 * shape,
          0.31 - Math.sin(a) * 0.52 * shape,
          (t - 0.5) * 3.15,
        );
      }),
      0.022,
    );
  }
  for (const z of [-0.65, 0.4])
    box(boat, p.wood, 0, 0.28, z, 0.97, 0.065, 0.25);
  const oar = new THREE.Group();
  oar.rotation.y = -0.44;
  oar.position.set(0.08, 0.39, 0.1);
  boat.add(oar);
  box(oar, p.paleWood, 0, 0, 0, 0.05, 0.05, 2.75);
  box(oar, p.paleWood, 0, 0, -1.42, 0.19, 0.035, 0.55);
  kit.batch(boat);
  return boat;
}

export function buildHarborBeacon(parent: THREE.Group, kit: HarborModeler) {
  const { palette: p, mesh, box, pebble, tube } = kit;
  const beacon = new THREE.Group();
  beacon.name = "distant-lighthouse";
  beacon.position.set(-18, -0.04, -24);
  parent.add(beacon);
  pebble(beacon, p.rock, 0, -0.45, 0, 4.7, 0.9, 3.5, 7);
  pebble(beacon, p.moss, 0, -0.05, 0, 3.5, 0.42, 2.6, 3);
  mesh(
    beacon,
    "tapered-tower",
    new THREE.CylinderGeometry(0.72, 1.08, 6.35, 32),
    p.plaster,
    0,
    3.22,
    0,
  );
  for (const y of [1.9, 4.3])
    mesh(
      beacon,
      "sea-green-tower-belt",
      new THREE.CylinderGeometry(1.08 - y * 0.056, 1.09 - y * 0.056, 0.43, 32),
      p.roof,
      0,
      y,
      0,
    );
  for (const y of [1.1, 3.1, 5.2])
    box(beacon, p.dark, 0, y, 1.06 - y * 0.056, 0.21, 0.42, 0.065);
  for (const y of [6.4, 6.62])
    mesh(
      beacon,
      "gallery-cornice",
      new THREE.CylinderGeometry(1.25, 1.17, 0.16, 32),
      p.cream,
      0,
      y,
      0,
    );
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    box(
      beacon,
      p.dark,
      Math.cos(a) * 1.2,
      6.98,
      Math.sin(a) * 1.2,
      0.035,
      0.6,
      0.035,
    );
  }
  const rail = mesh(
    beacon,
    "gallery-rail",
    new THREE.TorusGeometry(1.2, 0.025, 6, 40),
    p.dark,
    0,
    7.26,
    0,
  );
  rail.rotation.x = Math.PI / 2;
  mesh(
    beacon,
    "beacon-lens",
    new THREE.CylinderGeometry(0.67, 0.67, 0.94, 16),
    p.glass,
    0,
    7.18,
    0,
  );
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    box(
      beacon,
      p.dark,
      Math.cos(a) * 0.7,
      7.18,
      Math.sin(a) * 0.7,
      0.055,
      1.05,
      0.055,
    );
  }
  mesh(
    beacon,
    "beacon-roof",
    new THREE.ConeGeometry(1.02, 0.7, 16),
    p.roof,
    0,
    8.02,
    0,
  );
  tube(beacon, p.brass, [v3(0, 8.3, 0), v3(0, 8.65, 0)], 0.025, 3);
}
