import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { sculptSurface } from "./avatarSculpt";

export type HarborModeler = ReturnType<typeof createHarborModeler>;

/** Shared authoring tools; static pieces are welded into one draw per material. */
export function createHarborModeler() {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures: THREE.Texture[] = [];
  const grain = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const value =
        225 +
        Math.sin(x * 1.8 + Math.sin(y * 0.12) * 1.5) * 13 +
        Math.sin(x * 7.4 + y * 0.3) * 6;
      const i = (y * 64 + x) * 4;
      grain[i] = grain[i + 1] = grain[i + 2] = value;
      grain[i + 3] = 255;
    }
  const timber = new THREE.DataTexture(grain, 64, 64);
  timber.wrapS = timber.wrapT = THREE.RepeatWrapping;
  timber.colorSpace = THREE.SRGBColorSpace;
  timber.needsUpdate = true;
  textures.push(timber);
  const mat = (name: string, color: number, wood = false) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: wood ? 0.84 : 0.92,
      ...(wood ? { map: timber } : {}),
    });
    m.name = name;
    materials.add(m);
    return m;
  };
  const palette = {
    sand: mat("warm-shell-sand", 0xdac299),
    wetSand: mat("tidal-sand", 0x9c9b83),
    earth: mat("ochre-sandstone", 0xa88d68),
    grass: mat("meadow-sage", 0x78896a),
    moss: mat("soft-moss", 0x98a379),
    pine: mat("coastal-pine", 0x4c705d),
    leaf: mat("sunlit-foliage", 0x78906b),
    wood: mat("weathered-oak", 0x886448, true),
    paleWood: mat("sun-bleached-timber", 0xba9b73, true),
    dark: mat("forged-iron", 0x344b4c),
    plaster: mat("lime-plaster", 0xe9dcc0),
    cream: mat("linen", 0xf2e6ca),
    roof: mat("patinated-sea-green", 0x527c77),
    roofLight: mat("copper-roof-highlights", 0x6f9185),
    rock: mat("slate-stone", 0x7f8e88),
    rockLight: mat("stone-strata", 0xa3a99a),
    clay: mat("terracotta", 0xb77c60),
    coral: mat("dusty-coral", 0xc69583),
    rope: mat("woven-hemp", 0xc9b38a),
    brass: mat("aged-brass", 0xbba064),
    glass: mat("amber-lantern-glass", 0xffd59a),
  };
  palette.glass.emissive.set(0xffb95d);
  palette.glass.emissiveIntensity = 0.3;
  palette.brass.metalness = 0.55;
  palette.brass.roughness = 0.4;
  const mesh = (
    parent: THREE.Object3D,
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    parent.add(object);
    return object;
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
    mesh(
      parent,
      "joinery",
      new RoundedBoxGeometry(w, h, d, 1, Math.min(w, h, d) * 0.14),
      material,
      x,
      y,
      z,
    );
  const tube = (
    parent: THREE.Object3D,
    material: THREE.Material,
    points: THREE.Vector3[],
    radius: number,
    segments = 16,
  ) =>
    mesh(
      parent,
      "curved-detail",
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        segments,
        radius,
        5,
        false,
      ),
      material,
    );
  const beam = (
    parent: THREE.Object3D,
    material: THREE.Material,
    from: THREE.Vector3,
    to: THREE.Vector3,
    radius: number,
  ) => {
    const object = mesh(
      parent,
      "structural-timber",
      new THREE.CylinderGeometry(radius * 0.85, radius, from.distanceTo(to), 8),
      material,
    );
    object.position.copy(from).add(to).multiplyScalar(0.5);
    object.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      to.clone().sub(from).normalize(),
    );
    return object;
  };
  const pebble = (
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    seed = 0,
  ) => {
    const geometry = new THREE.SphereGeometry(1, 8, 5);
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) {
      const px = position.getX(i),
        py = position.getY(i),
        pz = position.getZ(i);
      const bulge =
        1 + Math.sin(px * 4 + seed) * Math.sin(pz * 3 - py * 2) * 0.12;
      position.setXYZ(i, px * w * bulge, py * h * bulge, pz * d * bulge);
    }
    geometry.computeVertexNormals();
    return mesh(parent, "organic-volume", geometry, material, x, y, z);
  };
  const lathe = (
    parent: THREE.Object3D,
    material: THREE.Material,
    profile: [number, number][],
    x: number,
    y: number,
    z: number,
  ) =>
    mesh(
      parent,
      "turned-detail",
      new THREE.LatheGeometry(
        profile.map(([r, height]) => new THREE.Vector2(r, height)),
        16,
      ),
      material,
      x,
      y,
      z,
    );
  const batch = (group: THREE.Group) => {
    group.updateWorldMatrix(true, true);
    const inverse = group.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
    const sources: THREE.Mesh[] = [];
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material))
        return;
      const geometry = object.geometry.index
        ? object.geometry.toNonIndexed()
        : object.geometry.clone();
      geometry.applyMatrix4(
        new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld),
      );
      // Every authored surface has the same attributes, including lathed and lofted pieces.
      for (const key of Object.keys(geometry.attributes))
        if (!["position", "normal", "uv"].includes(key))
          geometry.deleteAttribute(key);
      const bucket = buckets.get(object.material) ?? [];
      bucket.push(geometry);
      buckets.set(object.material, bucket);
      sources.push(object);
    });
    for (const [material, pieces] of buckets) {
      const geometry = mergeGeometries(pieces);
      pieces.forEach((piece) => piece.dispose());
      if (!geometry)
        throw new Error(`Cannot merge harbor material ${material.name}`);
      mesh(group, `assembled-${material.name}`, geometry, material);
    }
    sources.forEach((source) => source.removeFromParent());
    const retained = new Set<THREE.BufferGeometry>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) retained.add(object.geometry);
    });
    for (const source of sources) {
      if (!retained.has(source.geometry)) {
        source.geometry.dispose();
        geometries.delete(source.geometry);
      }
    }
  };
  return {
    palette,
    mesh,
    box,
    tube,
    beam,
    pebble,
    lathe,
    batch,
    sculptSurface,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}

export const v3 = (x: number, y: number, z: number) =>
  new THREE.Vector3(x, y, z);
