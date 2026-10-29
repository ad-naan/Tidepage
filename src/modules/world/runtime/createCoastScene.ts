import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { coastPlaces } from "@/modules/world/domain/coast-world";
import {
  journeyStops,
  type Journey,
  type JourneyId,
} from "@/modules/world/domain/coast-journey";
import {
  berth,
  seaIsClear,
  seaRoute,
  type SeaPoint,
} from "@/modules/world/domain/coast-navigation";
import { createCoastEnvironment } from "./coastEnvironment";

export type VoyageControls = {
  dispose: () => void;
  sailTo: (id: JourneyId) => void;
  restart: () => void;
};
type SceneOptions = {
  host: HTMLDivElement;
  state: () => {
    night: boolean;
    paused: boolean;
    help: boolean;
    reduced: boolean;
    journey: Journey;
  };
  onNearby: (id: JourneyId | null) => void;
  onInteract: () => void;
  onReady: () => void;
  onError: () => void;
};

export function createCoastScene(options: SceneOptions) {
  const { host } = options;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb4937e, 0.005);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 350);
  camera.position.set(9, 5.5, 24);
  const target = new THREE.Vector3(9, 1, 8);
  let previousTime = performance.now();
  let time = 0;
  let frame = 0;
  let disposed = false;
  let lost = false;
  let hidden = document.hidden;
  let nightBlend = 0;
  let previousNight = false;
  let nightStarted = performance.now();
  let nightOrigin = 0;
  const pointer = new THREE.Vector2();
  const look = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const pickable: THREE.Object3D[] = [];
  const trackedMaterials: THREE.Material[] = [];
  const trackedGeometries: THREE.BufferGeometry[] = [];
  const trackedTextures: THREE.Texture[] = [];
  const animateObjects: ((t: number) => void)[] = [];
  const lamps: THREE.MeshStandardMaterial[] = [];
  const backgroundColors = {
    dusk: new THREE.Color(0xb4937e),
    night: new THREE.Color(0x0a1628),
  };

  function mat(
    color: number,
    extra: THREE.MeshStandardMaterialParameters = {},
  ) {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      ...extra,
    });
    trackedMaterials.push(result);
    return result;
  }
  const chalk = mat(0xdad7c7),
    roof = mat(0x53696d),
    wood = mat(0x665447);
  const rock = mat(0x647678),
    sand = mat(0xb7ae92),
    grass = mat(0x697b58);
  const pine = mat(0x2e594b),
    pineLight = mat(0x4e7656),
    orange = mat(0xa26749);
  const metal = mat(0x293e43, { metalness: 0.5, roughness: 0.45 });
  const trim = mat(0xd8ceae),
    timber = mat(0x9d8264),
    darkGlass = mat(0x28444a, { roughness: 0.18, metalness: 0.3 });
  const terra = mat(0x976448),
    leaf = mat(0x66845e);
  const windowMat = mat(0xffd49a, {
    emissive: 0xffb35b,
    emissiveIntensity: 0.7,
  });
  lamps.push(windowMat);
  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    if (!geometry.getAttribute("uv"))
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(
          new Float32Array(geometry.getAttribute("position").count * 2),
          2,
        ),
      );
    trackedGeometries.push(geometry);
    const result = new THREE.Mesh(geometry, material);
    result.position.set(x, y, z);
    result.castShadow = material instanceof THREE.MeshStandardMaterial;
    result.receiveShadow = true;
    if (
      material instanceof THREE.MeshStandardMaterial &&
      !material.transparent &&
      !geometry.getAttribute("color")
    ) {
      const points = geometry.getAttribute("position");
      const colors = [];
      for (let i = 0; i < points.count; i++) {
        const v =
          0.91 +
          0.09 *
            Math.sin(
              points.getX(i) * 21 + points.getY(i) * 37 + points.getZ(i) * 17,
            );
        colors.push(v, v, v);
      }
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      material.vertexColors = true;
    }
    parent.add(result);
    return result;
  }
  function box(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    material = chalk,
  ) {
    const radius = Math.min(w, h, d, 0.16) * 0.16;
    return mesh(
      new RoundedBoxGeometry(w, h, d, 2, radius),
      material,
      parent,
      x,
      y,
      z,
    );
  }
  function cylinder(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    top: number,
    bottom: number,
    h: number,
    material = chalk,
    segments = 32,
  ) {
    return mesh(
      new THREE.CylinderGeometry(top, bottom, h, segments),
      material,
      parent,
      x,
      y,
      z,
    );
  }
  function ellipsoid(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    material: THREE.Material,
  ) {
    const result = mesh(
      new THREE.SphereGeometry(1, 24, 16),
      material,
      parent,
      x,
      y,
      z,
    );
    result.scale.set(sx, sy, sz);
    return result;
  }
  function tree(parent: THREE.Object3D, x: number, z: number, size: number) {
    cylinder(
      parent,
      x,
      0.65 + size,
      z,
      0.035 * size,
      0.105 * size,
      size * 2.3,
      wood,
      12,
    );
    // Irregular overlapping whorls make a fine evergreen silhouette instead of stacked spheres.
    for (let layer = 0; layer < 7; layer++) {
      const y = 0.6 + size * (0.35 + layer * 0.28),
        radius = size * (0.7 - layer * 0.075);
      const positions: number[] = [],
        indices: number[] = [];
      const count = 48;
      for (let ring = 0; ring < 4; ring++)
        for (let i = 0; i <= count; i++) {
          const a = (i / count) * Math.PI * 2;
          const edge =
            1 +
            Math.sin(a * 13 + layer) * 0.13 +
            Math.sin(a * 21 + layer * 3) * 0.08;
          const r = radius * [0.18, 1, 0.68, 0.035][ring] * edge;
          positions.push(
            x + Math.cos(a) * r,
            y +
              size * [0.0, 0.02, 0.19, 0.53][ring] +
              Math.sin(a * 11) * size * 0.035,
            z + Math.sin(a) * r,
          );
          if (ring && i) {
            const q = ring * (count + 1) + i,
              p = q - count - 1;
            indices.push(p - 1, p, q, p - 1, q, q - 1);
          }
        }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      mesh(geometry, layer % 3 ? pine : pineLight, parent);
      for (let branch = 0; branch < 7; branch++) {
        const a = branch * 2.399 + layer;
        const twig = mesh(
          new THREE.ConeGeometry(size * 0.055, size * 0.34, 5),
          pine,
          parent,
          x + Math.cos(a) * radius * 0.82,
          y + size * 0.12,
          z + Math.sin(a) * radius * 0.82,
        );
        twig.rotation.z = Math.cos(a) * 0.7;
        twig.rotation.x = Math.sin(a) * 0.7;
      }
    }
  }
  function tube(
    parent: THREE.Object3D,
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material = wood,
  ) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        16,
        radius,
        6,
        false,
      ),
      material,
      parent,
    );
  }
  function torus(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    radius: number,
    thickness: number,
    material = metal,
  ) {
    const ring = mesh(
      new THREE.TorusGeometry(radius, thickness, 8, 64),
      material,
      parent,
      x,
      y,
      z,
    );
    ring.rotation.x = Math.PI / 2;
    return ring;
  }
  function island(place: (typeof coastPlaces)[number], size: number) {
    const group = new THREE.Group();
    group.position.set(place.position[0], place.position[1], place.position[2]);
    group.userData.place = place.id;
    scene.add(group);
    pickable.push(group);
    // A continuous eroded shoreline with distinct grass, sand and rock strata.
    const positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    const rings = [
      { r: 0.0, y: 0.66, c: 0x7c8965 },
      { r: 0.42, y: 0.64, c: 0x74845c },
      { r: 0.72, y: 0.57, c: 0x7e8c68 },
      { r: 0.87, y: 0.35, c: 0xbdb294 },
      { r: 1, y: 0.08, c: 0xb5aa8e },
      { r: 0.99, y: -0.29, c: 0x6e7e7d },
      { r: 0.8, y: -1.05, c: 0x506567 },
    ];
    const segments = 72;
    for (let r = 0; r < rings.length; r++) {
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const outline =
          1 +
          Math.sin(a * 3 + size) * 0.13 +
          Math.sin(a * 5 + size * 2) * 0.055 +
          Math.cos(a * 9) * 0.025;
        const radius = rings[r].r * size * outline;
        positions.push(
          Math.cos(a) * radius,
          rings[r].y + (r > 1 ? Math.sin(a * 7 + r) * 0.065 : 0),
          Math.sin(a) * radius * 0.88,
        );
        const color = new THREE.Color(rings[r].c).multiplyScalar(
          0.92 + Math.sin(a * 11 + r) * 0.045 + r * 0.009,
        );
        colors.push(color.r, color.g, color.b);
        if (r && i) {
          const current = r * (segments + 1) + i;
          const previous = current - segments - 1;
          indices.push(
            previous - 1,
            current,
            current - 1,
            previous - 1,
            previous,
            current,
          );
        }
      }
    }
    const terrain = new THREE.BufferGeometry();
    terrain.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    terrain.setIndex(indices);
    terrain.computeVertexNormals();
    mesh(terrain, mat(0xffffff, { vertexColors: true }), group);
    for (let i = 0; i < 24; i++) {
      const a = i * 2.4;
      const radius = size * (1 + Math.sin(a * 3 + size) * 0.13);
      const stone = mesh(
        new THREE.DodecahedronGeometry(0.16 + (i % 4) * 0.085, 1),
        i % 3 ? rock : sand,
        group,
        Math.cos(a) * radius,
        -0.04,
        Math.sin(a) * radius * 0.88,
      );
      stone.scale.set(1.5, 0.6, 1);
      stone.rotation.set(i * 0.7, i * 1.3, i * 0.2);
    }
    // Small blades and seed heads break the clean model outline without dense assets.
    const blades: number[] = [];
    for (let i = 0; i < 65; i++) {
      const a = i * 2.399;
      const r = size * (0.71 + (i % 5) * 0.025);
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r * 0.88;
      const h = 0.12 + (i % 4) * 0.055;
      blades.push(
        x,
        0.51,
        z,
        x - 0.025,
        0.51 + h,
        z + 0.025,
        x + 0.04,
        0.51,
        z,
        x + 0.07,
        0.51 + h * 0.7,
        z - 0.02,
      );
    }
    const bladesGeometry = new THREE.BufferGeometry();
    bladesGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(blades, 3),
    );
    trackedGeometries.push(bladesGeometry);
    const bladesMaterial = new THREE.LineBasicMaterial({ color: 0x7b8965 });
    trackedMaterials.push(bladesMaterial);
    group.add(new THREE.LineSegments(bladesGeometry, bladesMaterial));
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf7e8c6,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    trackedMaterials.push(ringMat);
    const contour = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const r =
        size *
        (1.07 +
          Math.sin(a * 3 + size) * 0.13 +
          Math.sin(a * 5 + size * 2) * 0.055);
      contour.push(
        new THREE.Vector3(Math.cos(a) * r, -0.1, Math.sin(a) * r * 0.88),
      );
    }
    const ring = tube(group, contour, 0.018, ringMat);
    ring.userData.dynamic = true;
    animateObjects.push((t) => {
      ring.scale.setScalar(1 + Math.sin(t * 0.65 + size) * 0.07);
      ringMat.opacity = 0.15 + Math.sin(t * 0.65 + size) * 0.05;
    });
    return group;
  }

  const environment = createCoastEnvironment(scene);
  const water = environment.water;
  const ambient = new THREE.HemisphereLight(0xffe7c3, 0x547d83, 2.4);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xffd2a0, 3.1);
  sunlight.position.set(-25, 14, -45);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(2048, 2048);
  sunlight.shadow.camera.left = -30;
  sunlight.shadow.camera.right = 30;
  sunlight.shadow.camera.top = 30;
  sunlight.shadow.camera.bottom = -30;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 90;
  sunlight.shadow.normalBias = 0.035;
  sunlight.shadow.bias = -0.0002;
  sunlight.shadow.radius = 3;
  scene.add(sunlight);
  const fill = new THREE.DirectionalLight(0x90b7d2, 0.65);
  fill.position.set(15, 10, -15);
  scene.add(fill);

  const distantHaze: THREE.MeshBasicMaterial[] = [];
  for (let layer = 0; layer < 3; layer++) {
    const ridge = new THREE.Shape();
    ridge.moveTo(-110, -5);
    for (let i = 0; i <= 160; i++) {
      const x = -110 + i * 1.375;
      const y =
        0.2 +
        Math.pow(Math.sin(x * 0.057 + layer * 2.4), 2) * 2.9 +
        Math.sin(x * 0.16 + layer) * 0.65;
      ridge.lineTo(x, y);
    }
    ridge.lineTo(110, -5);
    ridge.closePath();
    const haze = new THREE.MeshBasicMaterial({
      color: [0xa1aca5, 0x91a3a0, 0x7d9696][layer],
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    trackedMaterials.push(haze);
    distantHaze.push(haze);
    mesh(new THREE.ShapeGeometry(ridge), haze, scene, 0, 0, -112 + layer * 12);
  }

  const tower = island(coastPlaces[0], 3.25);
  cylinder(tower, 0, 0.8, 0, 1.12, 1.23, 0.3, rock, 64);
  cylinder(tower, 0, 2.8, 0, 0.62, 1, 4.5, chalk, 64);
  cylinder(tower, 0, 2.3, 0, 0.82, 0.86, 0.25, orange, 64);
  for (let i = 0; i < 16; i++)
    torus(
      tower,
      0,
      0.85 + i * 0.245,
      0,
      1 - ((0.3 + i * 0.245) / 4.5) * 0.38,
      0.012,
      i % 4 === 0 ? trim : chalk,
    );
  cylinder(tower, 0, 4.85, 0, 1.05, 0.77, 0.2, trim, 64);
  cylinder(tower, 0, 4.99, 0, 1.08, 1.08, 0.12, roof, 64);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    cylinder(
      tower,
      Math.cos(a) * 0.98,
      5.25,
      Math.sin(a) * 0.98,
      0.023,
      0.023,
      0.52,
      metal,
      8,
    );
  }
  torus(tower, 0, 5.51, 0, 0.98, 0.035, metal);
  torus(tower, 0, 5.19, 0, 0.98, 0.02, metal);
  cylinder(tower, 0, 5.18, 0, 0.65, 0.7, 0.2, chalk, 64);
  const lanternGlass = mat(0xb8d1ce, {
    transparent: true,
    opacity: 0.27,
    roughness: 0.12,
    metalness: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  cylinder(tower, 0, 5.7, 0, 0.56, 0.56, 0.92, lanternGlass, 48);
  ellipsoid(tower, 0, 5.7, 0, 0.22, 0.32, 0.22, windowMat);
  for (let i = 0; i < 5; i++)
    torus(tower, 0, 5.48 + i * 0.1, 0, 0.27, 0.013, trim);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    cylinder(
      tower,
      Math.cos(a) * 0.59,
      5.7,
      Math.sin(a) * 0.59,
      0.028,
      0.028,
      1.05,
      metal,
      8,
    );
  }
  torus(tower, 0, 6.16, 0, 0.6, 0.045, metal);
  const domeProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.83, 0),
    new THREE.Vector2(0.79, 0.12),
    new THREE.Vector2(0.55, 0.35),
    new THREE.Vector2(0.28, 0.49),
    new THREE.Vector2(0.06, 0.6),
  ];
  mesh(new THREE.LatheGeometry(domeProfile, 48), roof, tower, 0, 6.17, 0);
  cylinder(tower, 0, 6.99, 0, 0.025, 0.04, 0.45, metal, 12);
  ellipsoid(tower, 0, 6.8, 0, 0.065, 0.065, 0.065, trim);
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-0.27, 0);
  doorShape.lineTo(-0.27, 0.85);
  doorShape.absarc(0, 0.85, 0.27, Math.PI, 0, true);
  doorShape.lineTo(0.27, 0);
  doorShape.closePath();
  mesh(
    new THREE.ExtrudeGeometry(doorShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
      curveSegments: 16,
    }),
    wood,
    tower,
    0,
    0.67,
    0.94,
  );
  for (let i = 0; i < 5; i++)
    box(tower, -0.2 + i * 0.1, 1.08, 1.02, 0.012, 0.8, 0.015, timber);
  ellipsoid(tower, 0.16, 1.18, 1.055, 0.035, 0.035, 0.025, metal);
  for (const y of [2.95, 3.9]) {
    const z = 1 - ((y - 0.55) / 4.5) * 0.38;
    box(tower, 0, y, z, 0.35, 0.56, 0.08, trim);
    box(tower, 0, y, z + 0.05, 0.23, 0.43, 0.04, darkGlass);
    box(tower, 0, y, z + 0.08, 0.025, 0.44, 0.025, trim);
    box(tower, 0, y, z + 0.08, 0.24, 0.025, 0.025, trim);
  }
  for (let i = 0; i < 4; i++)
    box(
      tower,
      0,
      0.69 - i * 0.065,
      1.18 + i * 0.22,
      0.7 + i * 0.08,
      0.12,
      0.26,
      rock,
    );
  tree(tower, -1.65, -0.8, 0.9);
  tree(tower, 1.4, -0.9, 0.7);
  for (let i = 0; i < 5; i++)
    box(
      tower,
      0.35 * Math.sin(i),
      0.65,
      1.3 + i * 0.28,
      0.6,
      0.08,
      0.23,
      chalk,
    );
  const beamGroup = new THREE.Group();
  tower.add(beamGroup);
  beamGroup.position.y = 5.65;
  beamGroup.userData.dynamic = true;
  const beamMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { strength: { value: 0 } },
    vertexShader: `varying float falloff;void main(){falloff=clamp((position.y+11.)/22.,0.,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float strength;varying float falloff;void main(){gl_FragColor=vec4(1.,.85,.58,strength*pow(falloff,2.5));}`,
  });
  trackedMaterials.push(beamMat);
  const beam = mesh(
    new THREE.ConeGeometry(4, 22, 24, 1, true),
    beamMat,
    beamGroup,
    11,
    0,
    0,
  );
  beam.rotation.z = Math.PI / 2;
  animateObjects.push((t) => {
    beamGroup.rotation.y = t * 0.16;
  });

  function house(parent: THREE.Group, x: number, z: number, scale: number) {
    const h = new THREE.Group();
    h.position.set(x, 0.65, z);
    h.scale.setScalar(scale);
    parent.add(h);
    box(h, 0, 0.1, 0, 2.25, 0.2, 1.95, rock);
    box(h, 0, 0.88, 0, 2.1, 1.55, 1.8);
    for (let i = 0; i < 9; i++) {
      box(h, 0, 0.22 + i * 0.16, 0.905, 2.1, 0.012, 0.025, trim);
      box(h, 1.055, 0.22 + i * 0.16, 0, 0.025, 0.012, 1.8, trim);
    }
    const gable = new THREE.Shape();
    gable.moveTo(-1.05, 0);
    gable.lineTo(0, 0.85);
    gable.lineTo(1.05, 0);
    gable.closePath();
    mesh(
      new THREE.ExtrudeGeometry(gable, { depth: 1.8, bevelEnabled: false }),
      chalk,
      h,
      0,
      1.65,
      -0.9,
    );
    const angle = Math.atan2(0.9, 1.2);
    for (const side of [-1, 1]) {
      const slope = box(h, side * 0.6, 2.1, 0, 1.55, 0.12, 2.18, roof);
      slope.rotation.z = -side * angle;
    }
    const tileGeometry = new RoundedBoxGeometry(0.245, 0.055, 0.26, 2, 0.02);
    trackedGeometries.push(tileGeometry);
    const tileMat = mat(0x667c7c, { roughness: 0.95 });
    const tiles = new THREE.InstancedMesh(tileGeometry, tileMat, 144);
    const dummy = new THREE.Object3D();
    let tile = 0;
    for (const side of [-1, 1])
      for (let row = 0; row < 6; row++)
        for (let col = 0; col < 12; col++) {
          const tx = (row + 0.5) * 0.2;
          dummy.position.set(side * tx, 2.62 - tx * 0.75, col * 0.18 - 1);
          dummy.rotation.set(0, 0, -side * angle);
          dummy.updateMatrix();
          tiles.setMatrixAt(tile, dummy.matrix);
          tiles.setColorAt(
            tile,
            new THREE.Color().setHSL(
              0.49,
              0.13,
              0.28 + ((row * 7 + col * 3) % 7) * 0.018,
            ),
          );
          tile++;
        }
    tiles.castShadow = true;
    tiles.receiveShadow = true;
    h.add(tiles);
    cylinder(h, 0, 2.62, 0, 0.06, 0.06, 2.25, roof, 16).rotation.x =
      Math.PI / 2;
    for (const side of [-1, 1]) {
      const fascia = box(h, side * 0.6, 2.1, 1.12, 1.56, 0.085, 0.07, trim);
      fascia.rotation.z = -side * angle;
    }
    box(h, 0.55, 2.4, -0.45, 0.32, 1.05, 0.35, terra);
    box(h, 0.55, 2.94, -0.45, 0.43, 0.08, 0.46, rock);
    for (let i = 0; i < 6; i++)
      box(h, 0.55, 2.03 + i * 0.15, -0.265, 0.33, 0.018, 0.014, trim);
    function windowAt(
      parent: THREE.Object3D,
      wx: number,
      wy: number,
      wz: number,
    ) {
      box(parent, wx, wy, wz, 0.65, 0.69, 0.08, wood);
      box(parent, wx, wy, wz + 0.055, 0.51, 0.55, 0.02, darkGlass);
      box(parent, wx, wy, wz + 0.074, 0.035, 0.57, 0.03, trim);
      box(parent, wx, wy, wz + 0.074, 0.53, 0.035, 0.03, trim);
      box(parent, wx, wy - 0.37, wz + 0.05, 0.77, 0.075, 0.2, trim);
      for (const s of [-1, 1]) {
        box(parent, wx + s * 0.42, wy, wz, 0.18, 0.7, 0.06, roof);
        for (let j = 0; j < 5; j++)
          box(
            parent,
            wx + s * 0.42,
            wy - 0.25 + j * 0.12,
            wz + 0.035,
            0.18,
            0.02,
            0.035,
            timber,
          );
      }
    }
    windowAt(h, -0.48, 0.99, 0.94);
    const sideWindow = new THREE.Group();
    sideWindow.position.set(1.08, 0, -0.1);
    sideWindow.rotation.y = Math.PI / 2;
    h.add(sideWindow);
    windowAt(sideWindow, 0, 1.02, 0);
    box(h, 0.5, 0.7, 0.94, 0.45, 1.14, 0.09, wood);
    box(h, 0.5, 1, 0.996, 0.27, 0.31, 0.04, darkGlass);
    box(h, 0.5, 0.48, 0.996, 0.28, 0.44, 0.025, timber);
    ellipsoid(h, 0.66, 0.72, 1.01, 0.028, 0.028, 0.02, metal);
    box(h, 0.5, 0.11, 1.1, 0.75, 0.18, 0.55, rock);
    box(h, 0.5, 0.035, 1.38, 0.9, 0.1, 0.3, rock);
    box(h, -0.48, 0.55, 1.12, 0.69, 0.19, 0.25, wood);
    for (let i = 0; i < 5; i++) {
      ellipsoid(h, -0.73 + i * 0.13, 0.72, 1.12, 0.11, 0.12, 0.1, leaf);
      ellipsoid(h, -0.73 + i * 0.13, 0.82, 1.12, 0.04, 0.035, 0.04, orange);
    }
    cylinder(h, -1.23, 0.21, 1.05, 0.17, 0.12, 0.35, terra);
    ellipsoid(h, -1.23, 0.49, 1.05, 0.21, 0.24, 0.18, pineLight);
    // Small loft window under the gable.
    const loft = mesh(
      new THREE.TorusGeometry(0.16, 0.025, 8, 24),
      trim,
      h,
      0,
      2.02,
      0.92,
    );
    const loftGlass = mesh(
      new THREE.CircleGeometry(0.15, 24),
      darkGlass,
      h,
      0,
      2.02,
      0.925,
    );
    loft.castShadow = false;
    loftGlass.castShadow = false;
    return h;
  }
  const home = island(coastPlaces[1], 3.1);
  house(home, 0.3, 0.2, 1.1);
  tree(home, -1.8, -0.7, 1.25);
  tree(home, 1.7, -1.3, 1.1);
  tree(home, -1.5, 1.4, 0.6);
  const workshop = island(coastPlaces[2], 3.45);
  house(workshop, 0.5, 0.2, 1.15);
  house(workshop, -1.5, -0.8, 0.65);
  const windmill = new THREE.Group();
  workshop.add(windmill);
  windmill.position.set(-1.1, 3.4, 1.5);
  windmill.userData.dynamic = true;
  cylinder(workshop, -1.1, 1.8, 1.5, 0.18, 0.27, 2.5, wood, 8);
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Group();
    blade.rotation.z = (i * Math.PI) / 2;
    windmill.add(blade);
    box(blade, 0, 0.68, 0, 0.045, 1.4, 0.05, wood);
    for (let j = 0; j < 6; j++)
      box(blade, 0.11, 0.27 + j * 0.17, 0, 0.28, 0.12, 0.035, timber);
  }
  ellipsoid(windmill, 0, 0, 0.06, 0.13, 0.13, 0.09, metal);
  box(workshop, 1.4, 1.22, 1.7, 1.25, 0.12, 0.55, wood);
  for (const x of [0.9, 1.9])
    box(workshop, x, 0.94, 1.7, 0.07, 0.56, 0.45, wood);
  for (let i = 0; i < 3; i++) {
    box(
      workshop,
      0.97 + i * 0.22,
      1.35,
      1.7,
      0.15,
      0.13,
      0.23,
      i % 2 ? roof : orange,
    );
  }
  for (let i = 0; i < 2; i++) {
    box(workshop, -2 + i * 0.45, 0.86, 1, 0.36, 0.4, 0.37, timber);
    for (let j = 0; j < 3; j++)
      box(
        workshop,
        -2 + i * 0.45,
        0.7 + j * 0.12,
        1.19,
        0.35,
        0.014,
        0.015,
        wood,
      );
  }
  animateObjects.push((t) => {
    windmill.rotation.z = -t * 0.32;
  });
  tree(workshop, 1.9, -1.5, 1.2);
  const bay = island(coastPlaces[3], 1.8);
  const glass = mat(0x84b5a2, {
    transparent: true,
    opacity: 0.8,
    roughness: 0.23,
    metalness: 0.2,
  });
  const bottle = new THREE.Group();
  bottle.position.set(0, 1, 0);
  bottle.rotation.z = 0.25;
  bay.add(bottle);
  cylinder(bottle, 0, 0, 0, 0.3, 0.3, 0.9, glass);
  cylinder(bottle, 0, 0.6, 0, 0.12, 0.25, 0.35, glass);
  cylinder(bottle, 0, 0.83, 0, 0.12, 0.12, 0.15, wood);
  box(bottle, 0, 0, 0.3, 0.31, 0.45, 0.015, chalk);
  for (let i = 0; i < 4; i++)
    ellipsoid(bay, 0.6 + i * 0.12, 0.7, 0.6, 0.12, 0.045, 0.09, chalk);
  const lookout = island(coastPlaces[4], 3.4);
  tree(lookout, -1.5, -0.9, 1.6);
  tree(lookout, 1.4, -1.4, 1.3);
  tree(lookout, 1.9, 0.5, 0.9);
  box(lookout, -0.5, 1.2, 1.2, 1.7, 0.15, 0.5, wood);
  box(lookout, -0.5, 1.6, 1, 1.7, 0.6, 0.1, wood);
  box(lookout, -1.1, 0.9, 1.2, 0.1, 0.6, 0.5, wood);
  box(lookout, 0.1, 0.9, 1.2, 0.1, 0.6, 0.5, wood);
  const frameArt = new THREE.Group();
  lookout.add(frameArt);
  frameArt.position.set(0.2, 2, 0.2);
  frameArt.rotation.y = 0.4;
  box(frameArt, 0, 0, 0, 1.6, 1.2, 0.12, orange);
  box(frameArt, 0, 0, 0.07, 1.4, 1, 0.03, mat(0x91b1ac));
  ellipsoid(frameArt, 0.35, 0.22, 0.1, 0.18, 0.18, 0.02, windowMat);
  mesh(new THREE.ConeGeometry(0.65, 0.65, 3), pine, frameArt, -0.15, -0.2, 0.1);
  const photoTexture = new THREE.TextureLoader().load("/images/coast.png");
  photoTexture.colorSpace = THREE.SRGBColorSpace;
  trackedTextures.push(photoTexture);
  const photoMaterial = new THREE.MeshStandardMaterial({
    map: photoTexture,
    roughness: 0.8,
  });
  trackedMaterials.push(photoMaterial);
  mesh(
    new THREE.PlaneGeometry(1.37, 0.97),
    photoMaterial,
    frameArt,
    0,
    0,
    0.14,
  );
  for (const side of [-1, 1]) {
    const leg = box(lookout, side * 0.5, 1.25, 0.2, 0.065, 1.6, 0.065, wood);
    leg.rotation.z = -side * 0.15;
  }
  const pier = island(coastPlaces[5], 2.6);
  for (let i = 0; i < 12; i++)
    box(pier, 0, 0.65, 1 + i * 0.3, 1.15, 0.1, 0.25, wood);
  for (let i = 0; i < 4; i++) {
    cylinder(pier, -0.65, 0.55, 1 + i, 0.07, 0.07, 1.6, wood, 5);
    cylinder(pier, 0.65, 0.55, 1 + i, 0.07, 0.07, 1.6, wood, 5);
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      tube(
        pier,
        [
          new THREE.Vector3(side * 0.65, 1.18, 1 + i),
          new THREE.Vector3(side * 0.65, 1.02, 1.5 + i),
          new THREE.Vector3(side * 0.65, 1.18, 2 + i),
        ],
        0.022,
        timber,
      );
      cylinder(pier, side * 0.65, 1.32, 1 + i, 0.085, 0.085, 0.07, timber, 16);
    }
  for (let i = 0; i < 12; i++) {
    for (const side of [-1, 1])
      ellipsoid(
        pier,
        side * 0.45,
        0.71,
        1 + i * 0.3,
        0.015,
        0.006,
        0.015,
        metal,
      );
  }
  for (const x of [-0.25, 0.25])
    cylinder(pier, x, 0.15, 4.44, 0.025, 0.025, 1.1, metal, 12);
  for (let i = 0; i < 4; i++)
    box(pier, 0, -0.25 + i * 0.25, 4.44, 0.52, 0.04, 0.04, metal);
  cylinder(pier, 1.7, 1.8, 1.15, 0.04, 0.07, 2.3, metal, 12);
  tube(
    pier,
    [
      new THREE.Vector3(1.7, 2.95, 1.15),
      new THREE.Vector3(1.7, 3.2, 1.15),
      new THREE.Vector3(1.35, 3.23, 1.15),
      new THREE.Vector3(1.3, 2.98, 1.15),
    ],
    0.035,
    metal,
  );
  box(pier, 1.3, 2.76, 1.15, 0.23, 0.4, 0.23, windowMat);
  cylinder(pier, 1.3, 3, 1.15, 0.17, 0.17, 0.08, metal, 12);
  cylinder(pier, 1.3, 2.53, 1.15, 0.17, 0.17, 0.08, metal, 12);
  box(pier, 1.2, 1.5, 0, 0.09, 1.8, 0.09, wood);
  box(pier, 1.2, 2.1, 0, 0.65, 0.5, 0.4, chalk);
  const otter = new THREE.Group();
  pier.add(otter);
  otter.position.set(-0.8, 0.8, 0.5);
  otter.rotation.y = 0.3;
  otter.userData.dynamic = true;
  const fur = mat(0x776252),
    cream = mat(0xcebaa0),
    eye = mat(0x222725);
  ellipsoid(otter, 0, 0.35, 0, 0.43, 0.38, 0.7, fur);
  ellipsoid(otter, 0, 0.62, 0.49, 0.38, 0.3, 0.33, fur);
  ellipsoid(otter, -0.3, 0.79, 0.42, 0.085, 0.09, 0.075, fur);
  ellipsoid(otter, 0.3, 0.79, 0.42, 0.085, 0.09, 0.075, fur);
  ellipsoid(otter, 0, 0.53, 0.75, 0.27, 0.15, 0.12, cream);
  ellipsoid(otter, 0, 0.62, 0.84, 0.07, 0.05, 0.04, eye);
  for (const x of [-0.19, 0.19]) {
    ellipsoid(otter, x, 0.71, 0.74, 0.025, 0.03, 0.02, eye);
    ellipsoid(otter, x * 1.7, 0.12, 0.3, 0.14, 0.09, 0.22, fur);
  }
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++)
      tube(
        otter,
        [
          new THREE.Vector3(side * 0.17, 0.53 + i * 0.035, 0.81),
          new THREE.Vector3(side * 0.33, 0.54 + i * 0.06, 0.85),
          new THREE.Vector3(side * 0.5, 0.55 + i * 0.075, 0.85),
        ],
        0.006,
        cream,
      );
  ellipsoid(otter, -0.22, 0.29, 0.59, 0.13, 0.11, 0.18, fur);
  ellipsoid(otter, 0.22, 0.29, 0.59, 0.13, 0.11, 0.18, fur);
  const tail = mesh(
    new THREE.ConeGeometry(0.24, 1.4, 12),
    fur,
    otter,
    0,
    0.18,
    -1.1,
  );
  tail.rotation.x = -Math.PI / 2;
  animateObjects.push((t) => {
    otter.scale.y = 1 + Math.sin(t * 1.6) * 0.025;
  });

  const relics = [
    { id: "quotes", parent: bay, x: 0, y: 2, z: 0 },
    { id: "notes", parent: home, x: -0.4, y: 2, z: 1.5 },
    { id: "projects", parent: workshop, x: 1.5, y: 1.8, z: 1.7 },
  ].map((item) => {
    const group = new THREE.Group();
    item.parent.add(group);
    group.position.set(item.x, item.y, item.z);
    group.userData.dynamic = true;
    const glow = mat(0xffce70, {
      emissive: 0xffa42e,
      emissiveIntensity: 2.5,
      roughness: 0.3,
    });
    mesh(new THREE.OctahedronGeometry(0.14, 2), glow, group);
    const light = new THREE.PointLight(0xffc176, 2, 4);
    group.add(light);
    animateObjects.push((t) => {
      group.position.y = item.y + Math.sin(t * 1.5) * 0.08;
      group.rotation.y = t * 0.4;
    });
    return { id: item.id, group };
  });
  const secret = new THREE.Group();
  secret.position.set(-24, 0, -30);
  secret.userData.place = "secret";
  scene.add(secret);
  pickable.push(secret);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    if (Math.abs(Math.cos(a)) < 0.45) continue;
    const r = 4.7;
    const stone = mesh(
      new THREE.DodecahedronGeometry(0.8, 2),
      rock,
      secret,
      Math.cos(a) * r,
      0.25,
      Math.sin(a) * r,
    );
    stone.scale.set(1.2, 0.7 + Math.sin(i) * 0.3, 1);
  }
  // Weathered sea arch, large enough for the boat to pass beneath.
  for (const side of [-1, 1]) {
    const pillar = mesh(
      new THREE.DodecahedronGeometry(1, 2),
      rock,
      secret,
      side * 2.7,
      1.4,
      -1,
    );
    pillar.scale.set(1.1, 2.3, 1.6);
  }
  const arch = tube(
    secret,
    [
      new THREE.Vector3(-2.8, 2.2, -1),
      new THREE.Vector3(-2, 4.4, -1),
      new THREE.Vector3(0, 5.1, -1),
      new THREE.Vector3(2, 4.4, -1),
      new THREE.Vector3(2.8, 2.2, -1),
    ],
    0.75,
    rock,
  );
  arch.receiveShadow = true;
  const blue = mat(0x67d8ef, { emissive: 0x29bce7, emissiveIntensity: 2 });
  const constellation = new THREE.Group();
  secret.add(constellation);
  constellation.userData.dynamic = true;
  const constellationPoints = [
    [-3, 7, 0],
    [-1.2, 8.1, 0],
    [0, 7.5, 0],
    [1.8, 9, 0],
    [3, 8.2, 0],
  ];
  constellationPoints.forEach(([x, y, z]) =>
    ellipsoid(constellation, x, y, z, 0.07, 0.07, 0.07, blue),
  );
  const constellationLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      constellationPoints.map((p) => new THREE.Vector3(...p)),
    ),
    new THREE.LineBasicMaterial({
      color: 0x94d9ff,
      transparent: true,
      opacity: 0.45,
    }),
  );
  trackedGeometries.push(constellationLine.geometry);
  trackedMaterials.push(constellationLine.material);
  constellation.add(constellationLine);
  const trail = new THREE.Group();
  scene.add(trail);
  for (let i = 0; i < 52; i++) {
    const t = i / 51,
      x = -3 - 21 * t + Math.sin(t * 12) * 1.3,
      z = -3 - 27 * t;
    const mote = ellipsoid(trail, x, 0.05, z, 0.035, 0.018, 0.035, blue);
    animateObjects.push((time) => {
      const pulse = 0.65 + Math.sin(time * 1.1 + i) * 0.3;
      mote.scale.set(0.035 * pulse, 0.018 * pulse, 0.035 * pulse);
    });
  }
  const secretLight = new THREE.PointLight(0x3abfe8, 12, 14);
  secretLight.position.set(0, 1, 0);
  secret.add(secretLight);

  function boat(x: number, z: number, size: number, player = false) {
    const group = new THREE.Group();
    group.position.set(x, 0.15, z);
    group.scale.setScalar(size);
    scene.add(group);
    const outline = new THREE.Shape();
    outline.moveTo(-0.9, 0);
    outline.quadraticCurveTo(-0.4, 0.42, 0.7, 0.22);
    outline.lineTo(0.95, 0);
    outline.lineTo(0.7, -0.22);
    outline.quadraticCurveTo(-0.4, -0.42, -0.9, 0);
    const hull = mesh(
      new THREE.ExtrudeGeometry(outline, {
        depth: 0.22,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.07,
        bevelThickness: 0.08,
        curveSegments: 20,
      }),
      wood,
      group,
      0,
      0.08,
      0,
    );
    hull.rotation.x = Math.PI / 2;
    const deck = mesh(
      new THREE.ShapeGeometry(outline, 20),
      trim,
      group,
      0,
      0.095,
      0,
    );
    deck.rotation.x = -Math.PI / 2;
    cylinder(group, 0, 0.65, 0, 0.025, 0.025, 1.5, wood, 5);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, 0.2, 0, 0, 1.4, 0, 0.8, 0.2, 0], 3),
    );
    geom.computeVertexNormals();
    const sail = mat(0xf5e9cf, { side: THREE.DoubleSide });
    mesh(geom, sail, group);
    tube(
      group,
      [
        new THREE.Vector3(-0.8, 0.13, 0),
        new THREE.Vector3(0, 1.39, 0),
        new THREE.Vector3(0.86, 0.13, 0),
      ],
      0.008,
      trim,
    );
    box(group, 0.1, 0.14, 0, 0.45, 0.05, 0.48, timber);
    animateObjects.push((t) => {
      group.position.y = 0.15 + Math.sin(t * 0.7 + x) * 0.09;
      group.rotation.z = Math.sin(t * 0.55 + z) * 0.06;
      if (!player) group.rotation.y = -0.6;
    });
    return group;
  }
  const player = boat(9, 12, 1.05, true);
  boat(-14, 0, 0.7);
  boat(6, -18, 0.55);

  // Fine architectural details are merged by material, not submitted one tile at a time.
  for (const root of pickable) {
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    const collect = (object: THREE.Object3D) => {
      if (object.userData.dynamic) return;
      if (
        object instanceof THREE.Mesh &&
        !(object instanceof THREE.InstancedMesh) &&
        !Array.isArray(object.material) &&
        !object.material.transparent
      ) {
        const items = batches.get(object.material) || [];
        items.push(object);
        batches.set(object.material, items);
      }
      object.children.forEach(collect);
    };
    collect(root);
    for (const [material, items] of batches) {
      if (items.length < 2) continue;
      const copies = items.map((item) => {
        const geometry = item.geometry.index
          ? item.geometry.toNonIndexed()
          : item.geometry.clone();
        return geometry.applyMatrix4(
          new THREE.Matrix4().multiplyMatrices(inverse, item.matrixWorld),
        );
      });
      const merged = mergeGeometries(copies, false);
      copies.forEach((copy) => copy.dispose());
      if (merged) {
        items.forEach((item) => item.removeFromParent());
        mesh(merged, material, root);
      }
    }
  }

  const birdMat = new THREE.LineBasicMaterial({
    color: 0xeee2c8,
    transparent: true,
    opacity: 0.8,
  });
  trackedMaterials.push(birdMat);
  for (let i = 0; i < 7; i++) {
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.5, 0.15, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.5, 0.15, 0),
    ]);
    trackedGeometries.push(geom);
    const bird = new THREE.Line(geom, birdMat);
    scene.add(bird);
    animateObjects.push((t) => {
      const a = t * 0.055 + i * 0.85;
      bird.position.set(
        Math.sin(a) * (10 + i),
        7 + Math.sin(t * 0.2 + i) * 1.2 + i * 0.4,
        -10 + Math.cos(a) * 6,
      );
      bird.rotation.y = -a;
      bird.scale.y = 0.6 + Math.sin(t * 2 + i) * 0.4;
    });
  }
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  let down: { x: number; y: number } | null = null;
  let dragDistance = 0;
  let zoom = 11;
  let route: SeaPoint[] = [];
  let nearby: JourneyId | null = null;
  const keys = new Set<string>();
  const sailTo = (id: JourneyId) => {
    const state = options.state();
    if (id === "secret" && !(state.journey.beacon && state.night)) return;
    route = seaRoute(player.position, berth(id));
  };
  const onDown = (e: PointerEvent) => {
    if (options.state().paused || options.state().help) return;
    down = { x: e.clientX, y: e.clientY };
    dragDistance = 0;
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (down) {
      const dx = e.clientX - down.x,
        dy = e.clientY - down.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      look.x -= dx * 0.004;
      look.y = THREE.MathUtils.clamp(look.y + dy * 0.004, -0.7, 1);
      down = { x: e.clientX, y: e.clientY };
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!down) return;
    down = null;
    if (renderer.domElement.hasPointerCapture(e.pointerId))
      renderer.domElement.releasePointerCapture(e.pointerId);
    if (dragDistance > 7) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      pickable.filter((p) => p.visible),
      true,
    )[0];
    if (hit) {
      let object: THREE.Object3D | null = hit.object;
      while (object && !object.userData.place) object = object.parent;
      if (object) sailTo(object.userData.place as JourneyId);
    } else {
      const seaHit = raycaster.intersectObject(water)[0];
      if (seaHit) {
        route = seaRoute(player.position, seaHit.point);
        environment.ripple(seaHit.point.x, seaHit.point.z, time);
      }
    }
  };
  const onCancel = () => {
    down = null;
  };
  const onWheel = (event: WheelEvent) => {
    if (options.state().help) return;
    event.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + event.deltaY * 0.012, 6, 23);
  };
  const onKey = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.closest("input,textarea,select") ||
        event.target.isContentEditable)
    )
      return;
    if (options.state().help || options.state().paused) return;
    const key = event.key.toLowerCase();
    if (["i", "j", "k", "l"].includes(key)) {
      event.preventDefault();
      if (key === "j" || key === "l") look.x += key === "j" ? -0.16 : 0.16;
      else
        look.y = THREE.MathUtils.clamp(
          look.y + (key === "i" ? -0.12 : 0.12),
          -0.7,
          1,
        );
    }
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowleft",
        "arrowdown",
        "arrowright",
      ].includes(key)
    ) {
      event.preventDefault();
      keys.add(key);
      route = [];
    }
    if (key === "e" && !event.repeat) options.onInteract();
  };
  const keyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
  const blur = () => {
    keys.clear();
    down = null;
  };
  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur);
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    options.onError();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  const desiredCamera = new THREE.Vector3(),
    desiredTarget = new THREE.Vector3();
  const velocity = new THREE.Vector2();
  const update = () => {
    if (disposed || lost || hidden) return;
    const now = performance.now(),
      dt = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    const state = options.state(),
      reduced = state.reduced,
      moving = !state.paused && !state.help;
    if (moving && !reduced) time += dt;
    if (state.night !== previousNight) {
      previousNight = state.night;
      nightStarted = now;
      nightOrigin = nightBlend;
    }
    nightBlend = THREE.MathUtils.lerp(
      nightOrigin,
      state.night ? 1 : 0,
      reduced ? 1 : 1 - Math.exp(-(now - nightStarted) / 900),
    );
    ambient.intensity = THREE.MathUtils.lerp(1.25, 0.32, nightBlend);
    sunlight.intensity = THREE.MathUtils.lerp(2.7, 0.28, nightBlend);
    fill.intensity = THREE.MathUtils.lerp(0.35, 0.55, nightBlend);
    sunlight.color.set(0xffbc77).lerp(new THREE.Color(0xa1c4f9), nightBlend);
    lamps.forEach((m) => {
      m.emissiveIntensity = 0.45 + nightBlend * 1.8;
    });
    beamMat.uniforms.strength.value = state.journey.beacon
      ? 0.008 + nightBlend * 0.022
      : 0;
    distantHaze.forEach((m, i) =>
      m.color
        .set([0xa1aca5, 0x91a3a0, 0x7d9696][i])
        .lerp(new THREE.Color(0x152739), nightBlend),
    );
    birdMat.opacity = 0.7 * (1 - nightBlend);
    (scene.fog as THREE.FogExp2).color
      .copy(backgroundColors.dusk)
      .lerp(backgroundColors.night, nightBlend);
    relics.forEach((r) => {
      r.group.visible = !state.journey.fragments.includes(
        r.id as "quotes" | "notes" | "projects",
      );
    });
    secret.visible = state.journey.beacon && state.night;
    trail.visible = secret.visible;
    constellation.visible = state.journey.discovered;
    velocity.set(0, 0);
    if (moving) {
      const forward =
        Number(keys.has("w") || keys.has("arrowup")) -
        Number(keys.has("s") || keys.has("arrowdown"));
      const side =
        Number(keys.has("d") || keys.has("arrowright")) -
        Number(keys.has("a") || keys.has("arrowleft"));
      if (forward || side)
        velocity
          .set(
            -Math.sin(look.x) * forward + Math.cos(look.x) * side,
            -Math.cos(look.x) * forward - Math.sin(look.x) * side,
          )
          .normalize();
      else if (route.length) {
        const waypoint = route[0];
        velocity.set(
          waypoint.x - player.position.x,
          waypoint.z - player.position.z,
        );
        if (velocity.length() < 0.2) route.shift();
        if (route.length) velocity.normalize();
        else velocity.set(0, 0);
      }
      const step = dt * 3.8,
        nx = player.position.x + velocity.x * step,
        nz = player.position.z + velocity.y * step;
      if (seaIsClear(nx, nz)) {
        player.position.x = nx;
        player.position.z = nz;
      } else route = [];
      if (velocity.lengthSq() > 0.1) {
        const heading = Math.atan2(-velocity.y, velocity.x);
        player.rotation.y +=
          Math.atan2(
            Math.sin(heading - player.rotation.y),
            Math.cos(heading - player.rotation.y),
          ) *
          (1 - Math.exp(-dt * 5));
      }
    }
    let closest: JourneyId | null = null;
    let best = Infinity;
    for (const p of journeyStops) {
      if (p.id === "secret" && !secret.visible) continue;
      const d = Math.hypot(player.position.x - p.x, player.position.z - p.z);
      if (d < p.radius + 2.5 && d < best) {
        best = d;
        closest = p.id;
      }
    }
    if (nearby !== closest) {
      nearby = closest;
      options.onNearby(nearby);
    }
    desiredTarget.set(
      player.position.x,
      1.1 + Math.max(-look.y, 0) * 9,
      player.position.z - 1.6,
    );
    const distance = zoom * (camera.aspect < 0.85 ? 1.2 : 1);
    desiredCamera.set(
      player.position.x + Math.sin(look.x) * distance,
      3.8 + distance * 0.13 + Math.max(look.y, 0) * 9,
      player.position.z + Math.cos(look.x) * distance,
    );
    const damping = reduced ? 1 : 1 - Math.exp(-dt * 3.5);
    camera.position.lerp(desiredCamera, damping);
    target.lerp(desiredTarget, damping);
    camera.lookAt(target);
    animateObjects.forEach((fn) => fn(time));
    environment.update(
      time,
      nightBlend,
      player.position,
      moving ? velocity.length() : 0,
    );
    renderer.render(scene, camera);
    frame = requestAnimationFrame(update);
  };
  const visibility = () => {
    hidden = document.hidden;
    if (hidden) cancelAnimationFrame(frame);
    else {
      previousTime = performance.now();
      frame = requestAnimationFrame(update);
    }
  };
  document.addEventListener("visibilitychange", visibility);
  update();
  options.onReady();
  return {
    sailTo,
    restart: () => {
      route = [];
      keys.clear();
      player.position.set(9, 0.15, 12);
      look.set(0, 0);
      zoom = 11;
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("webglcontextlost", onLost);
      trackedGeometries.forEach((geometry) => geometry.dispose());
      trackedMaterials.forEach((material) => material.dispose());
      trackedTextures.forEach((texture) => texture.dispose());
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      environment.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
