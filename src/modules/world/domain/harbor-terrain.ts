/** One shoreline definition for rendering, walking, sailing and server validation. */
export const harborIslands = [
  { x: 0, z: -39, rx: 64.7, rz: 47.4 },
  { x: -34, z: 32, rx: 9, rz: 7 },
  { x: 34, z: 39, rx: 11, rz: 8 },
  { x: 76, z: -46, rx: 8, rz: 10 },
] as const;
export type HarborIsland = (typeof harborIslands)[number];
export function shoreEdge(angle: number) {
  return (
    1 + Math.sin(angle * 3 + 0.5) * 0.027 + Math.sin(angle * 7 - 0.8) * 0.014
  );
}
export function shoreRadius(x: number, z: number, island: HarborIsland) {
  const dx = (x - island.x) / island.rx;
  const dz = (z - island.z) / island.rz;
  return Math.hypot(dx, dz) / shoreEdge(Math.atan2(dx, dz));
}
export function harborGroundHeight(x: number, z: number) {
  if (Math.abs(x) < 1.15 && z >= 3 && z <= 13) return 0.49;
  const radius = Math.min(
    ...harborIslands.map((island) => shoreRadius(x, z, island)),
  );
  const slope = Math.max(0, Math.min(1, (radius / 1.065 - 0.93) / 0.07));
  return 0.44 - slope * slope * (3 - 2 * slope) * 0.66 + 0.05;
}
export function harborLand(x: number, z: number) {
  return harborIslands.some((island) => shoreRadius(x, z, island) < 1.025);
}
export function harborSailable(x: number, z: number) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(z) &&
    Math.abs(x) < 4000 &&
    Math.abs(z) < 4000 &&
    !(Math.abs(x) < 1.85 && z >= 3 && z <= 13.7) &&
    harborIslands.every(
      (island) =>
        shoreRadius(x, z, island) >=
        1.06 + 0.85 / Math.min(island.rx, island.rz),
    )
  );
}
