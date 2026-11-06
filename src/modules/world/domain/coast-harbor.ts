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
export const HARBOR_WALK_SPEED = 2.4;

export function harborWalkable(x: number, z: number) {
  const land = (x / 10) ** 2 + ((z + 1) / 7.2) ** 2 < 0.9;
  const dock = Math.abs(x) < 1.1 && z >= 3 && z <= 10;
  const cottage = x > 1.3 && x < 6.8 && z > -6 && z < -0.5;
  const bench = x > -6.6 && x < -3.4 && z > -3 && z < -2;
  return (land || dock) && !cottage && !bench;
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
