import * as THREE from "three";
import { v3, type HarborModeler } from "./harborModeling";
import { harborTrees } from "../domain/coast-harbor";

/** The playable interior stays flat; only the outer shore slopes into the sea. */
export function harborShorePoint(angle: number, radius: number) {
  const edge =
    1 + Math.sin(angle * 3 + 0.5) * 0.027 + Math.sin(angle * 7 - 0.8) * 0.014;
  return v3(
    Math.sin(angle) * 64.7 * edge * radius,
    0,
    -39 + Math.cos(angle) * 47.4 * edge * radius,
  );
}

export function buildHarborTerrain(parent: THREE.Group, kit: HarborModeler) {
  const { palette: p, mesh, sculptSurface, pebble } = kit;
  mesh(
    parent,
    "sculpted-dune-shore",
    sculptSurface(
      (u, v) => {
        const point = harborShorePoint(u * Math.PI * 2, v * 1.065);
        point.y = 0.44 - THREE.MathUtils.smoothstep(v, 0.93, 1) * 0.66;
        return point;
      },
      144,
      36,
    ),
    p.sand,
  );
  mesh(
    parent,
    "submerged-sand-shelf",
    sculptSurface(
      (u, v) => {
        const point = harborShorePoint(u * Math.PI * 2, 1.01 + v * 0.11);
        point.y = -0.055 - v * 0.29;
        return point;
      },
      144,
      5,
    ),
    p.wetSand,
  );
  for (const [x, z, w, d, phase] of [
    [-4.5, -3.9, 4, 2.8, 0.4],
    [3.4, -4.1, 5.2, 2.3, 1.3],
    [0, -33, 34, 25, 0.7],
    [-30, -30, 15, 23, 1.2],
    [30, -40, 16, 24, 0.3],
  ])
    mesh(
      parent,
      "meadow-edge",
      sculptSurface(
        (u, v) => {
          const a = u * Math.PI * 2;
          const edge =
            1 + Math.sin(a * 3 + phase) * 0.13 + Math.cos(a * 5) * 0.06;
          return v3(
            x + Math.sin(a) * w * edge * v,
            0.446,
            z + Math.cos(a) * d * edge * v,
          );
        },
        72,
        8,
      ),
      p.grass,
    );
  for (const points of [
    [v3(0.25, 0, 3.8), v3(1.1, 0, 1.4), v3(3.8, 0, -0.55)],
    [v3(-0.2, 0, 3.1), v3(-2.4, 0, 0.4), v3(-4.9, 0, -1.35)],
    [v3(-1.5, 0, -3), v3(-2, 0, -13), v3(0, 0, -22)],
    [v3(0, 0, -22), v3(-16, 0, -18), v3(-27, 0, -29)],
    [v3(0, 0, -22), v3(18, 0, -33), v3(28, 0, -53)],
    [v3(-27, 0, -29), v3(-41, 0, -36), v3(-42, 0, -49)],
  ]) {
    const curve = new THREE.CatmullRomCurve3(points);
    const count = Math.ceil(curve.getLength() / 0.65);
    for (let i = 0; i <= count; i++) {
      const point = curve.getPoint(i / count);
      const stone = pebble(
        parent,
        i % 3 ? p.rockLight : p.rock,
        point.x,
        0.427,
        point.z,
        0.31 + (i % 2) * 0.08,
        0.055,
        0.23,
        i * 3,
      );
      stone.rotation.y = i * 0.9;
    }
  }
}

export function buildHarborNature(
  parent: THREE.Group,
  kit: HarborModeler,
  includeTrees = true,
) {
  const {
    palette: p,
    mesh,
    tube,
    beam,
    pebble,
    box,
    lathe,
    sculptSurface,
  } = kit;
  const trees = new THREE.Group();
  trees.name = "wind-shaped-coastal-grove";
  parent.add(trees);
  for (const { x, z, scale, phase } of includeTrees ? harborTrees : []) {
    const tree = new THREE.Group();
    tree.position.set(x, 0.44, z);
    tree.scale.setScalar(scale);
    tree.rotation.y = phase;
    trees.add(tree);
    mesh(
      tree,
      "tapered-bent-trunk",
      sculptSurface(
        (u, v) => {
          const a = u * Math.PI * 2;
          const r = (0.08 + v * 0.12) * (1 + Math.sin(a * 7 + v) * 0.065);
          return v3(
            Math.sin(a) * r + Math.sin((1 - v) * 2.5) * 0.19,
            (1 - v) * 3.6,
            Math.cos(a) * r + (1 - v) ** 2 * 0.3,
          );
        },
        16,
        18,
      ),
      p.wood,
    );
    for (let i = 0; i < 6; i++) {
      const a = i * 2.4 + phase,
        y = 2.3 + (i % 3) * 0.58;
      const end = v3(Math.cos(a) * 0.97, y + 0.6, Math.sin(a) * 0.84);
      beam(tree, p.wood, v3(0.13, y - 0.3, 0.1), end, 0.065);
      const crown = pebble(
        tree,
        i % 3 ? p.pine : p.leaf,
        end.x,
        end.y + 0.17,
        end.z,
        0.97,
        0.71,
        0.85,
        phase + i,
      );
      crown.rotation.y = a;
      for (let j = 0; j < 3; j++)
        pebble(
          tree,
          (i + j) % 3 ? p.leaf : p.moss,
          end.x + Math.cos(j * 2.1) * 0.48,
          end.y + 0.45 + Math.sin(j * 4) * 0.1,
          end.z + Math.sin(j * 2.1) * 0.4,
          0.49,
          0.36,
          0.45,
          j + phase,
        );
    }
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      tube(
        tree,
        p.wood,
        [
          v3(0.04, 0.2, 0.18),
          v3(Math.cos(a) * 0.26, 0.05, Math.sin(a) * 0.26),
          v3(Math.cos(a) * 0.55, 0.015, Math.sin(a) * 0.55),
        ],
        0.065,
        8,
      );
    }
  }
  for (const [angle, count] of [
    [-1.15, 6],
    [-2.3, 5],
    [1.5, 6],
    [2.8, 5],
  ])
    for (let i = 0; i < count; i++) {
      const point = harborShorePoint(
        angle + i * 0.075,
        0.99 + Math.sin(i * 4) * 0.035,
      );
      const scale = 0.45 + (i % 3) * 0.22;
      const rock = pebble(
        parent,
        i % 2 ? p.rock : p.rockLight,
        point.x,
        0.05,
        point.z,
        scale,
        scale * 0.7,
        scale * 0.8,
        i,
      );
      rock.rotation.set(0, i * 0.6, Math.sin(i) * 0.17);
      pebble(
        parent,
        p.moss,
        point.x + 0.02,
        scale * 0.5,
        point.z,
        scale * 0.65,
        scale * 0.09,
        scale * 0.55,
        i,
      );
    }
  // Ribbon blades and small flowers grow around the meadow edges.
  for (let i = 0; i < 90; i++) {
    const point = harborShorePoint(i * 2.39996, 0.88 + Math.sin(i * 7) * 0.028);
    if (point.z > 0.7 || (point.x > 0.8 && point.x < 7)) continue;
    for (let j = 0; j < 6; j++) {
      const direction = j * 2.4 + i,
        height = 0.2 + (j % 3) * 0.1;
      mesh(
        parent,
        "bent-dune-blade",
        sculptSurface(
          (u, v) => {
            const width = Math.sin(v * Math.PI) * 0.038;
            return v3(
              point.x + Math.cos(direction) * v * v * 0.21 + (u - 0.5) * width,
              0.44 + Math.sin(v * 1.3) * height,
              point.z + Math.sin(direction) * v * v * 0.21 + (u - 0.5) * width,
            );
          },
          2,
          6,
        ),
        j % 3 ? p.leaf : p.moss,
      );
    }
    if (i % 4 === 0) {
      tube(
        parent,
        p.pine,
        [v3(point.x, 0.44, point.z), v3(point.x + 0.04, 0.78, point.z)],
        0.009,
        3,
      );
      for (let petal = 0; petal < 5; petal++) {
        const a = petal * Math.PI * 0.4;
        pebble(
          parent,
          p.cream,
          point.x + Math.cos(a) * 0.045,
          0.79,
          point.z + Math.sin(a) * 0.045,
          0.044,
          0.018,
          0.035,
        );
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const x = Math.sin(i * 17.2) * 7.6,
      z = 1.7 + Math.cos(i * 9.7) * 2.9;
    if ((x / 9) ** 2 + ((z + 1) / 6.5) ** 2 > 0.9 || Math.abs(x) < 1.4)
      continue;
    const shell = mesh(
      parent,
      "ridged-scallop",
      sculptSurface(
        (u, v) => {
          const a = -1.1 + u * 2.2,
            r = 0.1 * v;
          return v3(
            Math.sin(a) * r,
            Math.sin(v * Math.PI) * 0.027 +
              Math.cos(u * 22 * Math.PI) * 0.003 * v,
            Math.cos(a) * r,
          );
        },
        24,
        8,
      ),
      i % 3 ? p.cream : p.coral,
      x,
      0.446,
      z,
    );
    shell.rotation.y = i * 3.2;
  }
  const picnic = new THREE.Group();
  picnic.name = "shore-picnic";
  picnic.position.set(-4.6, 0.455, 3.5);
  picnic.rotation.y = -0.13;
  parent.add(picnic);
  const clothPoint = (u: number, v: number) =>
    v3(
      (u - 0.5) * 2.35,
      Math.sin(u * 26) * Math.sin(v * 19) * 0.008 + 0.005,
      (v - 0.5) * 1.75,
    );
  mesh(picnic, "draped-linen", sculptSurface(clothPoint, 28, 20), p.cream);
  for (let i = 0; i < 6; i++)
    mesh(
      picnic,
      "woven-stripe",
      sculptSurface(
        (u, v) => {
          const point = clothPoint(i / 6 + u * 0.045, v);
          point.y += 0.001;
          return point;
        },
        2,
        20,
      ),
      p.coral,
    );
  for (let i = 0; i < 26; i++) {
    const x = -1.14 + i * 0.09;
    for (const side of [-1, 1])
      tube(
        picnic,
        p.cream,
        [
          v3(x, 0, side * 0.87),
          v3(x + Math.sin(i) * 0.015, -0.005, side * 0.94),
        ],
        0.008,
        2,
      );
  }
  box(picnic, p.roof, -0.28, 0.05, 0.27, 0.42, 0.075, 0.55);
  box(picnic, p.cream, -0.28, 0.05, 0.275, 0.39, 0.045, 0.5);
  box(picnic, p.roof, -0.28, 0.091, 0.27, 0.42, 0.015, 0.55);
  box(picnic, p.brass, -0.16, 0.105, 0.27, 0.025, 0.01, 0.55);
  for (const [x, z] of [
    [0.5, 0.15],
    [0.75, -0.3],
  ]) {
    lathe(
      picnic,
      p.clay,
      [
        [0.03, 0],
        [0.095, 0.015],
        [0.11, 0.17],
        [0.105, 0.19],
        [0.085, 0.18],
        [0.075, 0.035],
      ],
      x,
      0.01,
      z,
    );
    const handle = mesh(
      picnic,
      "cup-handle",
      new THREE.TorusGeometry(0.07, 0.02, 6, 12),
      p.clay,
      x + 0.12,
      0.115,
      z,
    );
    handle.rotation.y = Math.PI / 2;
    const tea = mesh(
      picnic,
      "tea-surface",
      new THREE.CircleGeometry(0.083, 16),
      p.wood,
      x,
      0.17,
      z,
    );
    tea.rotation.x = -Math.PI / 2;
  }
  lathe(
    picnic,
    p.paleWood,
    [
      [0, 0],
      [0.24, 0.02],
      [0.3, 0.31],
      [0.29, 0.35],
      [0.25, 0.34],
      [0.2, 0.05],
    ],
    -0.62,
    0,
    -0.4,
  );
  for (let i = 0; i < 8; i++) {
    const rim = mesh(
      picnic,
      "basket-weave",
      new THREE.TorusGeometry(0.245 + i * 0.007, 0.012, 5, 24),
      p.rope,
      -0.62,
      0.04 + i * 0.04,
      -0.4,
    );
    rim.rotation.x = Math.PI / 2;
  }
  tube(
    picnic,
    p.wood,
    [
      v3(-0.9, 0.3, -0.4),
      v3(-0.87, 0.67, -0.4),
      v3(-0.39, 0.67, -0.4),
      v3(-0.34, 0.3, -0.4),
    ],
    0.025,
  );
  for (let i = 0; i < 7; i++)
    pebble(
      parent,
      i % 2 ? p.rock : p.pine,
      -65 + i * 22,
      -2.9,
      -95 - Math.sin(i) * 12,
      18,
      5 + (i % 3),
      8,
      i,
    );
}
