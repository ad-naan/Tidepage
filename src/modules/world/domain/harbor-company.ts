import { harborRoute, harborWalkable, type HarborPoint } from "./coast-harbor";
import { harborIslands, shoreRadius } from "./harbor-terrain";

/** Both coastal animals can swim across the shoreline, but never through props. */
export function companionTraversable(x: number, z: number) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) >= 4000 ||
    Math.abs(z) >= 4000
  )
    return false;
  return (
    harborWalkable(x, z) ||
    harborIslands.every((island) => shoreRadius(x, z, island) >= 1.025)
  );
}

function clearSegment(a: HarborPoint, b: HarborPoint) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08));
  for (let i = 1; i <= steps; i++)
    if (
      !companionTraversable(
        a.x + ((b.x - a.x) * i) / steps,
        a.z + ((b.z - a.z) * i) / steps,
      )
    )
      return false;
  return true;
}

export function companionApproach(companion: HarborPoint, player: HarborPoint) {
  const heading = Math.atan2(player.x - companion.x, player.z - companion.z);
  for (const angle of [
    0,
    Math.PI / 4,
    -Math.PI / 4,
    Math.PI / 2,
    -Math.PI / 2,
    Math.PI,
  ]) {
    const point = {
      x: companion.x + Math.sin(heading + angle) * 1.7,
      z: companion.z + Math.cos(heading + angle) * 1.7,
    };
    if (harborWalkable(point.x, point.z)) return point;
  }
  return null;
}

export function createHarborFollower(start: HarborPoint, side: -1 | 1) {
  const position = { ...start };
  let route: HarborPoint[] = [];
  let cooldown = 0;
  let destination: HarborPoint | null = null;
  let yaw = 0;
  return {
    position,
    step(
      player: HarborPoint,
      heading: number,
      seconds: number,
      active: boolean,
      sailing: boolean,
    ) {
      const dt = Math.max(0, Math.min(seconds, 0.05));
      if (!active) {
        route = [];
        destination = null;
        cooldown = 0;
        return { moving: false, yaw };
      }
      cooldown -= dt;
      if (cooldown <= 0) {
        cooldown = 0.8;
        const offset = sailing ? 2.8 : 1.45;
        const candidates = [0, Math.PI / 2, -Math.PI / 2, Math.PI].map(
          (angle) => ({
            x:
              player.x +
              Math.cos(heading + angle) * offset * side -
              Math.sin(heading + angle) * 1.2,
            z:
              player.z -
              Math.sin(heading + angle) * offset * side -
              Math.cos(heading + angle) * 1.2,
          }),
        );
        const next = candidates.find(
          (p) => companionTraversable(p.x, p.z) && clearSegment(player, p),
        );
        if (
          next &&
          (!destination ||
            Math.hypot(next.x - destination.x, next.z - destination.z) > 0.65)
        ) {
          destination = next;
          // A network relocation must not cause an unbounded search or teleport a pet.
          route =
            Math.hypot(next.x - position.x, next.z - position.z) > 120
              ? []
              : clearSegment(position, next)
                ? [next]
                : harborRoute(position, next, companionTraversable);
        }
      }
      let remaining = dt * (sailing ? 9.2 : 4.6);
      let moving = false;
      while (route.length && remaining > 0) {
        const next = route[0];
        const dx = next.x - position.x,
          dz = next.z - position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.04) {
          route.shift();
          continue;
        }
        const step = Math.min(distance, remaining);
        position.x += (dx / distance) * step;
        position.z += (dz / distance) * step;
        yaw = Math.atan2(dx, dz);
        remaining -= step;
        moving = true;
        if (step === distance) route.shift();
      }
      return { moving, yaw };
    },
  };
}

export type HarborMoment =
  "welcome" | "wave" | "rest" | "sky" | "sail" | "night" | "together" | "stay";

/** Authored, local responses: no timer-driven model calls or repeated idle chatter. */
export function createHarborMoments() {
  let clock = 0,
    next = 4,
    resting = 0;
  const heard = new Set<HarborMoment>();
  let last = { wave: false, sky: false, sailing: false, night: false };
  return {
    step(input: {
      seconds: number;
      nearby: boolean;
      paused: boolean;
      wave: boolean;
      sky: boolean;
      sailing: boolean;
      night: boolean;
      sitting: boolean;
    }) {
      if (input.paused) return null;
      clock += Math.max(0, Math.min(input.seconds, 0.05));
      resting = input.sitting ? resting + input.seconds : 0;
      const event: HarborMoment | null =
        input.wave && !last.wave
          ? "wave"
          : input.sky && !last.sky
            ? "sky"
            : input.sailing && !last.sailing
              ? "sail"
              : input.night && !last.night
                ? "night"
                : null;
      last = input;
      if (!input.nearby || clock < next) return null;
      const moment =
        event ??
        (!heard.has("welcome")
          ? "welcome"
          : resting > 8 && !heard.has("rest")
            ? "rest"
            : null);
      if (!moment || (moment !== "wave" && heard.has(moment))) return null;
      heard.add(moment);
      next = clock + 30;
      return moment;
    },
  };
}
