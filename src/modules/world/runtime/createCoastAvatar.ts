import * as THREE from "three";
import {
  avatarColors,
  type CoastAvatar,
  type AvatarPose,
} from "../domain/coast-avatar";
import { sculptLoft, sculptSurface, sculptSweep } from "./avatarSculpt";

/** Curve-authored character: continuous face, tailored fabric and swept hair locks. */
export function createCoastAvatar(appearance: CoastAvatar) {
  const root = new THREE.Group();
  root.name = "coast-companion";
  const body = new THREE.Group();
  body.name = "body";
  root.add(body);
  const materials: THREE.MeshStandardMaterial[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const mat = (name: string, color: string, roughness = 0.78) => {
    const material = new THREE.MeshStandardMaterial({ color, roughness });
    material.name = name;
    materials.push(material);
    return material;
  };
  const skin = mat("skin", avatarColors.skin[appearance.skin]);
  const faceSkin = mat("face-skin", avatarColors.skin[appearance.skin]);
  faceSkin.vertexColors = true;
  const coat = mat("coat", avatarColors.coat[appearance.coat]);
  const hair = mat("hair", avatarColors.hair[appearance.hairColor], 0.68);
  const hairGroove = mat("hair-groove", "#49362d", 0.8);
  const trousers = mat("trousers", "#546d76"),
    shoes = mat("shoes", "#f0e3cb");
  const soles = mat("soles", "#c8b69a"),
    cream = mat("knit", "#f6e9d1");
  const iris = mat("iris", "#493329", 0.26),
    pupil = mat("pupil", "#211f25", 0.2);
  const eyeWhite = mat("eye-white", "#fff8e9", 0.35);
  const mouth = mat("mouth", "#a26357"),
    bagMat = mat("satchel", "#b38758");
  const brass = mat("brass", "#d8ba78", 0.4),
    scarfMat = mat("scarf", "#d5a084");
  const add = (
    parent: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const vector = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z);
  const line = (
    parent: THREE.Object3D,
    name: string,
    material: THREE.Material,
    points: THREE.Vector3[],
    radius: number,
  ) =>
    add(
      parent,
      name,
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        18,
        radius,
        5,
        false,
      ),
      material,
    );
  const petal = (
    parent: THREE.Object3D,
    name: string,
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
      name,
      sculptSurface(
        (u, v) => {
          const a = u * Math.PI * 2,
            p = v * Math.PI;
          return vector(
            Math.sin(a) * Math.sin(p) * w,
            Math.cos(p) * h,
            Math.cos(a) * Math.sin(p) * d,
          );
        },
        24,
        16,
      ),
      material,
      x,
      y,
      z,
    );

  add(
    body,
    "tailored-coat",
    sculptLoft(
      [
        { y: 0.6, x: 0.001, z: 0.001 },
        { y: 0.62, x: 0.37, z: 0.24 },
        { y: 0.72, x: 0.395, z: 0.255 },
        { y: 0.98, x: 0.33, z: 0.23 },
        { y: 1.18, x: 0.31, z: 0.205 },
        { y: 1.3, x: 0.26, z: 0.17 },
        { y: 1.32, x: 0.1, z: 0.1 },
        { y: 1.31, x: 0.001, z: 0.001 },
      ],
      0.022,
    ),
    coat,
  );
  line(
    body,
    "coat-opening",
    cream,
    [vector(0, 0.66, 0.252), vector(0, 0.95, 0.235), vector(0, 1.24, 0.18)],
    0.012,
  );
  for (const y of [0.82, 1, 1.15])
    petal(
      body,
      "wood-button",
      brass,
      0.035,
      y,
      0.235 - (y - 0.8) * 0.1,
      0.024,
      0.024,
      0.012,
    );
  for (const side of [-1, 1]) {
    line(
      body,
      "pocket-welt",
      coat,
      [
        vector(side * 0.15, 0.85, 0.234),
        vector(side * 0.24, 0.82, 0.21),
        vector(side * 0.3, 0.83, 0.17),
      ],
      0.021,
    );
    const collar = add(
      body,
      "folded-collar",
      sculptSweep(
        [
          vector(side * 0.02, 1.25, 0.21),
          vector(side * 0.14, 1.32, 0.17),
          vector(side * 0.24, 1.27, 0.05),
        ],
        0.07,
        0.045,
        0.3,
      ),
      cream,
    );
    collar.rotation.z = side * 0.05;
  }
  petal(body, "neck", skin, 0, 1.34, 0, 0.12, 0.19, 0.12);
  const hips = new THREE.Group();
  hips.name = "hips";
  hips.position.y = 0.69;
  body.add(hips);
  const legs = [-1, 1].map((side, i) => {
    const thigh = new THREE.Group();
    thigh.name = i ? "right-thigh" : "left-thigh";
    thigh.position.x = side * 0.17;
    hips.add(thigh);
    add(
      thigh,
      "trouser-thigh",
      sculptLoft(
        [
          { y: 0.03, x: 0, z: 0 },
          { y: 0, x: 0.145, z: 0.145 },
          { y: -0.15, x: 0.14, z: 0.14 },
          { y: -0.32, x: 0.125, z: 0.13 },
        ],
        0.015,
        24,
      ),
      trousers,
    );
    const shin = new THREE.Group();
    shin.name = i ? "right-shin" : "left-shin";
    shin.position.y = -0.29;
    thigh.add(shin);
    add(
      shin,
      "trouser-cuff",
      sculptLoft(
        [
          { y: 0.03, x: 0.125, z: 0.13 },
          { y: -0.15, x: 0.12, z: 0.12 },
          { y: -0.22, x: 0.135, z: 0.13 },
          { y: -0.24, x: 0.13, z: 0.125 },
        ],
        0.01,
        24,
      ),
      trousers,
    );
    add(
      shin,
      "canvas-shoe",
      sculptLoft(
        [
          { y: -0.22, x: 0.06, z: 0.07 },
          { y: -0.24, x: 0.12, z: 0.13, offset: 0.02 },
          { y: -0.31, x: 0.15, z: 0.23, offset: 0.065 },
          { y: -0.36, x: 0.155, z: 0.23, offset: 0.07 },
        ],
        0,
        28,
      ),
      shoes,
    );
    add(
      shin,
      "shoe-sole",
      sculptLoft(
        [
          { y: -0.355, x: 0.155, z: 0.23, offset: 0.07 },
          { y: -0.39, x: 0.155, z: 0.23, offset: 0.07 },
          { y: -0.395, x: 0.001, z: 0.001, offset: 0.07 },
        ],
        0,
        28,
      ),
      soles,
    );
    for (const z of [0.08, 0.14])
      line(
        shin,
        "shoe-lace",
        cream,
        [
          vector(-0.085, -0.255, z),
          vector(0, -0.245, z + 0.01),
          vector(0.085, -0.255, z),
        ],
        0.009,
      );
    return { thigh, shin };
  });
  const arms = [-1, 1].map((side, i) => {
    const upper = new THREE.Group();
    upper.name = i ? "right-arm" : "left-arm";
    upper.position.set(side * 0.31, 1.2, 0);
    body.add(upper);
    add(
      upper,
      "rounded-sleeve",
      sculptLoft(
        [
          { y: 0.075, x: 0, z: 0 },
          { y: 0.03, x: 0.13, z: 0.15 },
          { y: -0.15, x: 0.14, z: 0.145 },
          { y: -0.3, x: 0.115, z: 0.125 },
        ],
        0.025,
        24,
      ),
      coat,
    );
    const forearm = new THREE.Group();
    forearm.name = i ? "right-forearm" : "left-forearm";
    forearm.position.y = -0.27;
    upper.add(forearm);
    add(
      forearm,
      "sleeve-cuff",
      sculptLoft(
        [
          { y: 0.03, x: 0.115, z: 0.125 },
          { y: -0.09, x: 0.12, z: 0.13 },
          { y: -0.16, x: 0.115, z: 0.12 },
          { y: -0.165, x: 0.001, z: 0.001 },
        ],
        0.01,
        24,
      ),
      coat,
    );
    add(
      forearm,
      "mitten-hand",
      sculptSurface(
        (u, v) => {
          const a = u * Math.PI * 2,
            p = v * Math.PI;
          const thumb =
            Math.exp(-(((v - 0.42) / 0.13) ** 2)) *
            Math.max(0, Math.sin(a)) ** 6 *
            0.065;
          return vector(
            Math.sin(a) * Math.sin(p) * 0.097 + thumb,
            -0.23 + Math.cos(p) * 0.125,
            Math.cos(a) * Math.sin(p) * 0.092 + 0.015,
          );
        },
        28,
        20,
      ),
      skin,
    );
    return { upper, forearm };
  });
  const head = new THREE.Group();
  head.name = "head";
  head.position.set(0, 1.7, 0.015);
  body.add(head);
  const gaussian = (value: number, center: number, width: number) =>
    Math.exp(-(((value - center) / width) ** 2));
  const faceDepth = (x: number, y: number) => {
    const jaw = 1 - THREE.MathUtils.smoothstep(-y, 0.13, 0.47) * 0.17;
    const base =
      0.405 *
      Math.sqrt(Math.max(0.001, 1 - (x / (0.51 * jaw)) ** 2 - (y / 0.49) ** 2));
    const nose = 0.075 * gaussian(x, 0, 0.058) * gaussian(y, -0.08, 0.075);
    const cheeks =
      0.024 *
      (gaussian(x, -0.26, 0.12) + gaussian(x, 0.26, 0.12)) *
      gaussian(y, -0.09, 0.12);
    return base + nose + cheeks;
  };
  const face = sculptSurface(
    (u, v) => {
      const a = u * Math.PI * 2,
        p = v * Math.PI,
        y = Math.cos(p) * 0.49;
      const jaw = 1 - THREE.MathUtils.smoothstep(-y, 0.13, 0.47) * 0.17;
      const x = Math.sin(a) * Math.sin(p) * 0.51 * jaw,
        z = Math.cos(a) * Math.sin(p) * 0.405;
      return vector(x, y, Math.cos(a) > 0 ? faceDepth(x, y) : z);
    },
    64,
    44,
  );
  const facePositions = face.getAttribute("position"),
    blushColors: number[] = [];
  for (let i = 0; i < facePositions.count; i++) {
    const x = facePositions.getX(i),
      y = facePositions.getY(i),
      z = facePositions.getZ(i);
    const blush =
      (gaussian(x, -0.29, 0.12) + gaussian(x, 0.29, 0.12)) *
      gaussian(y, -0.095, 0.085) *
      Math.max(0, z) *
      1.8;
    blushColors.push(1, 1 - blush * 0.32, 1 - blush * 0.27);
  }
  face.setAttribute("color", new THREE.Float32BufferAttribute(blushColors, 3));
  add(head, "continuous-cheeks-chin-nose", face, faceSkin);
  for (const side of [-1, 1]) {
    petal(head, "ear", skin, side * 0.49, -0.035, -0.015, 0.095, 0.13, 0.075);
    petal(
      head,
      "ear-inner",
      mouth,
      side * 0.515,
      -0.04,
      0.047,
      0.04,
      0.065,
      0.012,
    );
    const eyeX = side * 0.19,
      eyeY = 0.015;
    const eyePatch = (
      name: string,
      material: THREE.Material,
      w: number,
      h: number,
      offset: number,
    ) =>
      add(
        head,
        name,
        sculptSurface(
          (u, v) => {
            const a = u * Math.PI * 2,
              r = Math.sin((v * Math.PI) / 2);
            const x = eyeX + Math.cos(a) * r * w,
              y = eyeY + Math.sin(a) * r * h;
            return vector(
              x,
              y,
              faceDepth(x, y) +
                offset +
                Math.sqrt(Math.max(0, 1 - r * r)) * 0.012,
            );
          },
          32,
          10,
        ),
        material,
      );
    eyePatch("eye-outline", pupil, 0.084, 0.106, 0.008);
    eyePatch("warm-iris", iris, 0.068, 0.089, 0.014);
    eyePatch("pupil", pupil, 0.046, 0.075, 0.024);
    petal(
      head,
      "eye-catchlight",
      eyeWhite,
      eyeX - 0.022,
      eyeY + 0.039,
      faceDepth(eyeX - 0.022, eyeY + 0.039) + 0.04,
      0.022,
      0.028,
      0.01,
    );
    petal(
      head,
      "eye-catchlight-small",
      eyeWhite,
      eyeX + 0.025,
      eyeY - 0.04,
      faceDepth(eyeX + 0.025, eyeY - 0.04) + 0.035,
      0.01,
      0.012,
      0.006,
    );
    line(
      head,
      "eyebrow",
      hair,
      [
        vector(eyeX - 0.067, 0.16, faceDepth(eyeX - 0.067, 0.16) + 0.012),
        vector(eyeX, 0.175, faceDepth(eyeX, 0.175) + 0.014),
        vector(eyeX + 0.055, 0.16, faceDepth(eyeX + 0.055, 0.16) + 0.012),
      ],
      0.013,
    );
  }
  line(
    head,
    "quiet-smile",
    mouth,
    [-0.055, -0.027, 0, 0.027, 0.055].map((x) => {
      const y = -0.205 + (Math.abs(x) / 0.055) ** 1.7 * 0.018;
      return vector(x, y, faceDepth(x, y) + 0.008);
    }),
    0.009,
  );

  const styles = {
    crop: new THREE.Group(),
    bob: new THREE.Group(),
    waves: new THREE.Group(),
  };
  for (const [style, group] of Object.entries(styles)) {
    group.name = `hair-${style}`;
    head.add(group);
    add(
      group,
      "sculpted-hair-cap",
      sculptSurface(
        (u, v) => {
          const a = u * Math.PI * 2,
            front = Math.cos(a);
          const end =
            style === "bob"
              ? 1.27 + (1 - front) * 0.68
              : 1.16 + (1 - front) * 0.52;
          const p = v * end,
            flute = 1 + 0.009 * Math.cos(a * 13 + v * 2);
          return vector(
            Math.sin(a) * Math.sin(p) * 0.54 * flute,
            Math.cos(p) * 0.535 + 0.015,
            Math.cos(a) * Math.sin(p) * 0.443 * flute - 0.025,
          );
        },
        48,
        28,
      ),
      hair,
    );
    const locks = style === "waves" ? 6 : 4;
    for (let i = 0; i < locks; i++) {
      const x = -0.4 + i * (0.8 / (locks - 1)),
        y = 0.24 - Math.sin(i * 1.7) * 0.035;
      const points = [
        vector(x * 0.65 - 0.07, 0.46, 0.14),
        vector(x - 0.035, 0.36, 0.34),
        vector(x + 0.025, y, 0.405 - Math.abs(x) * 0.13),
        vector(
          x + (style === "waves" ? 0.065 : 0.015),
          y - 0.08,
          0.36 - Math.abs(x) * 0.08,
        ),
      ];
      add(
        group,
        "swept-fringe",
        sculptSweep(points, style === "waves" ? 0.12 : 0.155, 0.06, 0.95),
        hair,
      );
      if (i % 2 === 0)
        line(
          group,
          "hair-engraving",
          hairGroove,
          [
            points[0].clone().add(vector(0, 0, 0.025)),
            points[1].clone().add(vector(0, 0, 0.045)),
            points[2].clone().add(vector(0, 0, 0.025)),
          ],
          0.0035,
        );
    }
    for (const side of [-1, 1]) {
      const bottom = style === "bob" ? -0.33 : style === "waves" ? -0.13 : 0;
      add(
        group,
        "temple-lock",
        sculptSweep(
          [
            vector(side * 0.37, 0.37, 0.1),
            vector(side * 0.48, 0.15, 0.13),
            vector(side * 0.47, bottom, 0.08),
            vector(side * 0.41, bottom - 0.06, 0.09),
          ],
          style === "bob" ? 0.13 : 0.08,
          0.08,
          0.7,
        ),
        hair,
      );
    }
  }
  const satchel = new THREE.Group();
  satchel.name = "accessory-satchel";
  body.add(satchel);
  add(
    satchel,
    "soft-leather-bag",
    sculptLoft(
      [
        { y: 0.64, x: 0, z: 0 },
        { y: 0.66, x: 0.16, z: 0.105 },
        { y: 0.78, x: 0.19, z: 0.12 },
        { y: 0.94, x: 0.16, z: 0.105 },
        { y: 0.95, x: 0.001, z: 0.001 },
      ],
      0,
      28,
    ),
    bagMat,
    0.36,
    0,
    -0.02,
  );
  line(
    satchel,
    "bag-strap",
    bagMat,
    [
      vector(-0.2, 1.28, 0.12),
      vector(-0.08, 1.2, 0.25),
      vector(0.13, 0.99, 0.255),
      vector(0.36, 0.84, 0.13),
    ],
    0.026,
  );
  line(
    satchel,
    "bag-flap-stitch",
    cream,
    [
      vector(0.2, 0.88, 0.075),
      vector(0.35, 0.83, 0.115),
      vector(0.51, 0.88, 0.075),
    ],
    0.005,
  );
  petal(satchel, "bag-clasp", brass, 0.36, 0.81, 0.111, 0.025, 0.035, 0.015);
  const scarf = new THREE.Group();
  scarf.name = "accessory-scarf";
  body.add(scarf);
  add(
    scarf,
    "knitted-scarf",
    sculptLoft(
      [
        { y: 1.28, x: 0.17, z: 0.16 },
        { y: 1.31, x: 0.22, z: 0.2 },
        { y: 1.39, x: 0.19, z: 0.17 },
        { y: 1.4, x: 0.12, z: 0.12 },
      ],
      0.022,
      36,
    ),
    scarfMat,
  );
  const tail = add(
    scarf,
    "scarf-tail",
    sculptSweep(
      [
        vector(-0.17, 1.33, 0.18),
        vector(-0.21, 1.13, 0.27),
        vector(-0.16, 0.94, 0.3),
      ],
      0.085,
      0.025,
      0.1,
    ),
    scarfMat,
  );
  for (let i = 0; i < 5; i++)
    line(
      scarf,
      "scarf-fringe",
      scarfMat,
      [
        vector(-0.22 + i * 0.028, 0.98, 0.3),
        vector(-0.23 + i * 0.028, 0.9, 0.3),
      ],
      0.006,
    );

  function dress(next: CoastAvatar) {
    skin.color.set(avatarColors.skin[next.skin]);
    faceSkin.color.copy(skin.color);
    coat.color.set(avatarColors.coat[next.coat]);
    hair.color.set(avatarColors.hair[next.hairColor]);
    hairGroove.color.copy(hair.color).multiplyScalar(0.76);
    for (const [name, group] of Object.entries(styles))
      group.visible = name === next.hairStyle;
    satchel.visible = next.accessory === "satchel";
    scarf.visible = next.accessory === "scarf";
  }
  dress(appearance);
  return {
    root,
    dress,
    update: (time: number, pose: AvatarPose, reduced: boolean) => {
      const t = reduced ? 0 : time,
        walking = pose === "walk",
        sitting = pose === "sit";
      body.position.y = sitting
        ? -0.22
        : walking
          ? Math.abs(Math.sin(t * 8)) * 0.035
          : Math.sin(t * 1.6) * 0.009;
      body.rotation.z = walking ? Math.sin(t * 8) * 0.025 : 0;
      head.rotation.z = !reduced && pose === "wave" ? -0.07 : 0;
      legs.forEach(({ thigh, shin }, i) => {
        thigh.rotation.x = sitting
          ? -Math.PI / 2
          : walking
            ? Math.sin(t * 8 + i * Math.PI) * 0.48
            : 0;
        shin.rotation.x = sitting
          ? Math.PI / 2
          : walking
            ? Math.max(0, -Math.sin(t * 8 + i * Math.PI)) * 0.45
            : 0;
      });
      arms.forEach(({ upper, forearm }, i) => {
        upper.rotation.x = walking
          ? -Math.sin(t * 8 + i * Math.PI) * 0.37
          : sitting
            ? -0.4
            : 0;
        upper.rotation.z = (i ? 1 : -1) * 0.14;
        forearm.rotation.x = sitting ? -0.25 : -0.07;
      });
      if (pose === "wave") {
        arms[1].upper.rotation.z = 2.5 + Math.sin(t * 8) * 0.14;
        arms[1].forearm.rotation.x = -0.25;
      }
      tail.rotation.z = Math.sin(t * 2) * 0.025;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      root.removeFromParent();
    },
  };
}
