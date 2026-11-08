import {
  harborLand,
  harborSailable,
  harborIslands,
  shoreRadius,
} from "./harbor-terrain";
export type HarborPoint = { x: number; z: number };
export const harborMooring: HarborPoint = { x: 2.28, z: 12.5 };
export const HARBOR_SAIL_SPEED = 8;
export const harborPlaces = {
  dock: { x: 0, z: 12 },
  beach: { x: -4.5, z: 3.5 },
  bench: { x: -5, z: -1.5 },
  cottage: { x: 3.6, z: 0.4 },
} as const;
export type HarborPlace = keyof typeof harborPlaces;
export const harborDestinations = {
  ...harborPlaces,
  square: { x: 0, z: -22 },
  grove: { x: -22, z: -31 },
  ruins: { x: 28, z: -53 },
  lookout: { x: -42, z: -49 },
  lighthouse: { x: -18, z: -21.5 },
  shellIsland: { x: -34, z: 32 },
  windIsland: { x: 34, z: 39 },
  starIsland: { x: 76, z: -46 },
} as const;
export type HarborDestination = keyof typeof harborDestinations;
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
  const group = [...harborSeating].sort(
    (a, b) =>
      Math.min(
        ...a.seats.map((s) => Math.hypot(s.x - point.x, s.z - point.z)),
      ) -
      Math.min(...b.seats.map((s) => Math.hypot(s.x - point.x, s.z - point.z))),
  )[0];
  return {
    x: group.seats.length > 1 ? point.x : group.approach.x,
    z: group.approach.z,
  };
}
export const HARBOR_WALK_SPEED = 2.4;
export const HARBOR_RUN_SPEED = 4.2;
export const harborInteractions = {
  bench: { x: -5, z: -1.5, radius: 1.7 },
  chair: { x: 3.15, z: -3.5, radius: 1.15 },
  door: { x: 4.5, z: -0.7, radius: 1.5 },
  hearth: { x: 5.1, z: -2.1, radius: 1.1 },
  crystal: { x: -1.6, z: -4.5, radius: 1.6 },
  sail: { x: 0, z: 12, radius: 3 },
  land: { x: 0, z: 12, radius: 3 },
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
  { x: -24, z: -14, scale: 1.5, phase: 3 },
  { x: -31, z: -18, scale: 1.8, phase: 7 },
  { x: -39, z: -24, scale: 1.6, phase: 2 },
  { x: 21, z: -20, scale: 1.5, phase: 5 },
  { x: 30, z: -27, scale: 1.8, phase: 4 },
  { x: 38, z: -30, scale: 1.7, phase: 8 },
  { x: -11, z: -31, scale: 1.4, phase: 2 },
  { x: -17, z: -42, scale: 1.8, phase: 6 },
  { x: 7, z: -40, scale: 1.4, phase: 5 },
  { x: 15, z: -47, scale: 1.6, phase: 4 },
  { x: -38, z: -49, scale: 1.6, phase: 8 },
  { x: -45, z: -43, scale: 1.7, phase: 2 },
  { x: 28, z: -58, scale: 1.8, phase: 4 },
  { x: 36, z: -61, scale: 1.4, phase: 7 },
] as const;

export function harborWalkable(x: number, z: number) {
  const land = harborLand(x, z);
  const dock = Math.abs(x) < 1.1 && z >= 3 && z <= 13;
  if (!land && !dock) return false;
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
  const beacon = Math.hypot(x + 18, z + 24) < 1.35;
  const trunk = harborTrees.some(
    (tree) => Math.hypot(x - tree.x, z - tree.z) < 0.22 * tree.scale + 0.28,
  );
  return (land || dock) && !cottage && !bench && !trunk && !chair && !beacon;
}

/** Bounded half-metre grid shared by pointer navigation and destination controls. */
export function harborRoute(
  start: HarborPoint,
  end: HarborPoint,
  traversable = harborWalkable,
  grid = 0.5,
): HarborPoint[] {
  if (!traversable(end.x, end.z)) return [];
  if (traversable === harborWalkable) {
    const islandAt = (p: HarborPoint) =>
      Math.max(
        0,
        harborIslands.findIndex(
          (island) => shoreRadius(p.x, p.z, island) < 1.025,
        ),
      );
    if (islandAt(start) !== islandAt(end)) return [];
  }
  const segmentClear = (a: HarborPoint, b: HarborPoint) => {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08),
    );
    for (let i = 1; i <= steps; i++)
      if (
        !traversable(
          a.x + ((b.x - a.x) * i) / steps,
          a.z + ((b.z - a.z) * i) / steps,
        )
      )
        return false;
    return true;
  };
  const snap = (point: HarborPoint) => {
    const candidates: HarborPoint[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const p = {
          x: (Math.round(point.x / grid) + dx) * grid,
          z: (Math.round(point.z / grid) + dz) * grid,
        };
        if (traversable(p.x, p.z) && segmentClear(point, p)) candidates.push(p);
      }
    return candidates.sort(
      (a, b) =>
        Math.hypot(a.x - point.x, a.z - point.z) -
        Math.hypot(b.x - point.x, b.z - point.z),
    )[0];
  };
  const from = snap(start),
    to = snap(end);
  if (!from || !to) return [];
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(from.x / grid),
    sz = Math.round(from.z / grid);
  const ex = Math.round(to.x / grid),
    ez = Math.round(to.z / grid);
  if (!traversable(ex * grid, ez * grid)) return [];
  const open = [{ x: sx, z: sz, cost: 0, score: 0 }];
  const costs = new Map([[key(sx, sz), 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  while (open.length && closed.size < 120_000) {
    open.sort((a, b) => b.score - a.score || a.cost - b.cost);
    const current = open.pop()!;
    const id = key(current.x, current.z);
    if (closed.has(id)) continue;
    closed.add(id);
    if (current.x === ex && current.z === ez) {
      const path: HarborPoint[] = [end];
      let cursor = id;
      while (parents.has(cursor)) {
        const [x, z] = cursor.split(",").map(Number);
        path.push({ x: x * grid, z: z * grid });
        cursor = parents.get(cursor)!;
      }
      path.push(from);
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
        !traversable(x * grid, z * grid) ||
        !segmentClear(
          { x: current.x * grid, z: current.z * grid },
          { x: x * grid, z: z * grid },
        ) ||
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

/** Only step ashore within reach; a boat is never teleported across the map. */
export function harborLanding(point: HarborPoint): HarborPoint | null {
  for (let radius = 0.5; radius <= 3; radius += 0.25)
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      const candidate = {
        x: point.x + Math.sin(angle) * radius,
        z: point.z + Math.cos(angle) * radius,
      };
      if (harborWalkable(candidate.x, candidate.z)) return candidate;
    }
  return null;
}

export function harborSailingRoute(
  start: HarborPoint,
  destination: HarborPoint,
) {
  let end = destination;
  if (!harborSailable(end.x, end.z)) {
    const candidates: HarborPoint[] = [];
    for (let radius = 1; radius <= 75; radius++) {
      for (let i = 0; i < 96; i++) {
        const angle = (i / 96) * Math.PI * 2;
        const point = {
          x: destination.x + Math.sin(angle) * radius,
          z: destination.z + Math.cos(angle) * radius,
        };
        if (harborSailable(point.x, point.z) && harborLanding(point))
          candidates.push(point);
      }
      if (candidates.length) break;
    }
    end = candidates.sort(
      (a, b) =>
        Math.hypot(a.x - start.x, a.z - start.z) -
        Math.hypot(b.x - start.x, b.z - start.z),
    )[0];
    if (!end) return [];
  }
  return harborRoute(start, end, harborSailable, 0.5);
}
