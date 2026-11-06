export type HarborPoint = { x: number; z: number };
export const harborPlaces = {
  dock: { x: 0, z: 8.5 },
  beach: { x: -4.5, z: 3.5 },
  bench: { x: -5, z: -1.5 },
  cottage: { x: 3.6, z: 0.4 },
} as const;
export type HarborPlace = keyof typeof harborPlaces;
export const harborSpawn: HarborPoint = { x: 0, z: 5 };
export const harborSeats = [-6.1, -5, -3.9].map((x) => ({ x, z: -2.45 }));
export const harborSeating = [
  { approach: harborPlaces.bench, seats: harborSeats, yaw: 0 },
  {
    approach: { x: 3.15, z: -3.5 },
    seats: [{ x: 2.35, z: -3.5 }],
    yaw: Math.PI,
  },
];
export function harborStandingPoint(point: HarborPoint): HarborPoint {
  return Math.hypot(point.x - 2.35, point.z + 3.5) < 0.5
    ? harborSeating[1].approach
    : { x: point.x, z: harborPlaces.bench.z };
}
export const HARBOR_WALK_SPEED = 2.4;
export const HARBOR_RUN_SPEED = 4.2;
export const harborInteractions = {
  bench: { x: -5, z: -1.5, radius: 1.7 },
  chair: { x: 3.15, z: -3.5, radius: 1.15 },
  door: { x: 4.5, z: -0.7, radius: 1.5 },
  hearth: { x: 5.1, z: -2.1, radius: 1.1 },
  crystal: { x: -1.6, z: -4.5, radius: 1.6 },
  sail: { x: 0, z: 8.5, radius: 1.5 },
} as const;
export type HarborInteraction = keyof typeof harborInteractions;
export const harborInside = (x: number, z: number) =>
  x > 1.8 && x < 6.2 && z > -5.1 && z < -1.5;
// Shared by scenery and authoritative navigation, so trunks are solid for every player.
export const harborTrees = [
  { x: -8, z: -3.7, scale: 1.03, phase: 1 },
  { x: -7, z: -5.4, scale: 0.87, phase: 3 },
  { x: -2.4, z: -6.5, scale: 1.08, phase: 7 },
  { x: 0.3, z: -7, scale: 0.84, phase: 5 },
  { x: 8, z: -4.5, scale: 0.92, phase: 9 },
  { x: 7.2, z: -5.6, scale: 0.75, phase: 2 },
] as const;

export function harborWalkable(x: number, z: number) {
  const land = (x / 10) ** 2 + ((z + 1) / 7.2) ** 2 < 0.9;
  const dock = Math.abs(x) < 1.1 && z >= 3 && z <= 10;
  const footprint = x > 1.3 && x < 6.8 && z > -6 && z < -0.5;
  const doorway = x > 4 && x < 5 && z > -2 && z < -0.4;
  const interior = x > 1.95 && x < 6.05 && z > -4.95 && z < -1.6;
  const bed = x > 4.65 && z < -3.12;
  const desk = x < 3.05 && z < -3.85;
  const fireplace = x > 5.15 && z > -2.72 && z < -1.5;
  const chair = Math.hypot(x - 2.35, z + 3.5) < 0.45;
  const cottage =
    footprint && !(doorway || (interior && !bed && !desk && !fireplace));
  const bench = x > -6.6 && x < -3.4 && z > -3 && z < -2;
  const trunk = harborTrees.some(
    (tree) => Math.hypot(x - tree.x, z - tree.z) < 0.22 * tree.scale + 0.28,
  );
  return (land || dock) && !cottage && !bench && !trunk && !chair;
}

/** Bounded half-metre grid shared by pointer navigation and destination controls. */
export function harborRoute(
  start: HarborPoint,
  end: HarborPoint,
): HarborPoint[] {
  if (!harborWalkable(end.x, end.z)) return [];
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(start.x * 2),
    sz = Math.round(start.z * 2);
  const ex = Math.round(end.x * 2),
    ez = Math.round(end.z * 2);
  const open = [{ x: sx, z: sz, cost: 0, score: 0 }];
  const costs = new Map([[key(sx, sz), 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  while (open.length && closed.size < 2400) {
    open.sort((a, b) => b.score - a.score);
    const current = open.pop()!;
    const id = key(current.x, current.z);
    if (closed.has(id)) continue;
    closed.add(id);
    if (current.x === ex && current.z === ez) {
      const path: HarborPoint[] = [end];
      let cursor = id;
      while (parents.has(cursor)) {
        const [x, z] = cursor.split(",").map(Number);
        path.push({ x: x / 2, z: z / 2 });
        cursor = parents.get(cursor)!;
      }
      return path.reverse();
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = current.x + dx,
        z = current.z + dz;
      const next = key(x, z),
        cost = current.cost + 1;
      if (
        !harborWalkable(x / 2, z / 2) ||
        cost >= (costs.get(next) ?? Infinity)
      )
        continue;
      parents.set(next, id);
      costs.set(next, cost);
      open.push({
        x,
        z,
        cost,
        score: cost + Math.abs(ex - x) + Math.abs(ez - z),
      });
    }
  }
  return [];
}
