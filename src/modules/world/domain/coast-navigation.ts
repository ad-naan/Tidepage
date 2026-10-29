import { journeyStops, type JourneyId } from "./coast-journey";
export type SeaPoint = { x: number; z: number };
export function seaIsClear(x: number, z: number) {
  return (
    Math.abs(x) < 42 &&
    Math.abs(z) < 42 &&
    journeyStops.every(
      (p) =>
        p.id === "secret" || Math.hypot(x - p.x, z - p.z) > p.radius + 0.55,
    )
  );
}
// A small bounded navigation grid keeps click-to-sail paths outside the shorelines.
export function seaRoute(start: SeaPoint, end: SeaPoint): SeaPoint[] {
  const key = (x: number, z: number) => `${x},${z}`;
  const sx = Math.round(start.x),
    sz = Math.round(start.z),
    ex = Math.round(end.x),
    ez = Math.round(end.z);
  if (!seaIsClear(ex, ez)) return [];
  const open = [{ x: sx, z: sz, g: 0, f: 0 }];
  const costs = new Map<string, number>([[key(sx, sz), 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  while (open.length && closed.size < 7200) {
    open.sort((a, b) => b.f - a.f);
    const current = open.pop()!;
    const id = key(current.x, current.z);
    if (closed.has(id)) continue;
    closed.add(id);
    if (current.x === ex && current.z === ez) {
      const path: SeaPoint[] = [{ x: ex, z: ez }];
      let cursor = id;
      while (parents.has(cursor)) {
        cursor = parents.get(cursor)!;
        const [x, z] = cursor.split(",").map(Number);
        path.push({ x, z });
      }
      return path.reverse().slice(1);
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = current.x + dx,
        z = current.z + dz;
      if (
        !seaIsClear(x, z) ||
        !seaIsClear(current.x + dx, current.z) ||
        !seaIsClear(current.x, current.z + dz)
      )
        continue;
      const next = key(x, z),
        g = current.g + Math.hypot(dx, dz);
      if (g >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, g);
      parents.set(next, id);
      open.push({ x, z, g, f: g + Math.hypot(ex - x, ez - z) });
    }
  }
  return [];
}
export function berth(id: JourneyId): SeaPoint {
  const stop = journeyStops.find((p) => p.id === id)!;
  return { x: stop.x, z: stop.z + (id === "secret" ? 1 : stop.radius + 1.5) };
}
