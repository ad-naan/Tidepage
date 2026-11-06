import * as THREE from "three";

/** Connected quad surfaces authored from silhouettes and cross-section curves. */
export function sculptSurface(
  point: (u: number, v: number) => THREE.Vector3,
  columns = 40,
  rows = 24,
) {
  const positions: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= rows; row++)
    for (let col = 0; col <= columns; col++) {
      const u = col / columns,
        v = row / rows;
      positions.push(...point(u, v).toArray());
      uv.push(u, v);
    }
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col,
        b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type SculptSection = { y: number; x: number; z: number; offset?: number };

/** Catmull-Rom lofts give clothing a continuous, tailored silhouette. */
export function sculptLoft(input: SculptSection[], folds = 0, segments = 36) {
  const sections = input.at(-1)!.y > input[0].y ? [...input].reverse() : input;
  const width = new THREE.CatmullRomCurve3(
    sections.map((s) => new THREE.Vector3(s.x, s.y, s.z)),
    false,
    "catmullrom",
    0.2,
  );
  const offset = new THREE.CatmullRomCurve3(
    sections.map((s) => new THREE.Vector3(s.offset ?? 0, s.y, 0)),
    false,
    "catmullrom",
    0.2,
  );
  return sculptSurface(
    (u, v) => {
      const section = width.getPoint(v),
        center = offset.getPoint(v),
        a = u * Math.PI * 2;
      const fabric =
        1 + folds * Math.sin(a * 7 + v * 3) * Math.sin(v * Math.PI);
      return new THREE.Vector3(
        Math.sin(a) * Math.max(0.001, section.x) * fabric,
        section.y,
        Math.cos(a) * Math.max(0.001, section.z) * fabric + center.x,
      );
    },
    segments,
    28,
  );
}

/** Tapered elliptical cross-sections follow a curved lock or garment edge. */
export function sculptSweep(
  points: THREE.Vector3[],
  width: number,
  depth: number,
  taper = 0.85,
  segments = 24,
) {
  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);
  return sculptSurface(
    (u, v) => {
      const center = curve.getPointAt(v),
        index = Math.min(segments, Math.round(v * segments));
      const scale =
          Math.pow(Math.max(0.001, Math.sin(Math.PI * v)), 0.28) *
          (1 - taper * v * 0.45),
        a = u * Math.PI * 2;
      return center
        .addScaledVector(frames.normals[index], Math.cos(a) * width * scale)
        .addScaledVector(frames.binormals[index], Math.sin(a) * depth * scale);
    },
    12,
    segments,
  );
}
