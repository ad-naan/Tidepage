import { coastPlaces, type PlaceId } from "./coast-world";

export type JourneyId = PlaceId | "secret";
export const fragments = ["quotes", "notes", "projects"] as const;
export type Fragment = (typeof fragments)[number];
export type Journey = {
  fragments: Fragment[];
  beacon: boolean;
  discovered: boolean;
};
export const emptyJourney: Journey = {
  fragments: [],
  beacon: false,
  discovered: false,
};
export const journeyStops = [
  ...coastPlaces.map((p) => ({
    id: p.id as JourneyId,
    x: p.position[0],
    z: p.position[2],
    radius: p.id === "quotes" ? 2 : 3.5,
  })),
  { id: "secret" as JourneyId, x: -24, z: -30, radius: 4.5 },
];
export function restoreJourney(value: unknown): Journey {
  if (!value || typeof value !== "object") return emptyJourney;
  const data = value as Partial<Journey>;
  const found = fragments.filter(
    (id) => Array.isArray(data.fragments) && data.fragments.includes(id),
  );
  const beacon = found.length === 3 && data.beacon === true;
  return {
    fragments: found,
    beacon,
    discovered: beacon && data.discovered === true,
  };
}
/** Notice keys map to the "world.notices" message catalog; the UI renders them. */
export type JourneyNotice = {
  key:
    | "kept"
    | "found"
    | "complete"
    | "beaconDark"
    | "beaconLit"
    | "secret"
    | "otter"
    | "wind";
  count?: number;
};
export function interactJourney(
  journey: Journey,
  id: JourneyId,
  night: boolean,
): { journey: Journey; notice: JourneyNotice } {
  if (fragments.includes(id as Fragment)) {
    if (journey.fragments.includes(id as Fragment))
      return { journey, notice: { key: "kept" } };
    const found = [...journey.fragments, id as Fragment];
    return {
      journey: { ...journey, fragments: found },
      notice: {
        key: found.length === 3 ? "complete" : "found",
        count: found.length,
      },
    };
  }
  if (id === "articles") {
    if (journey.fragments.length < 3)
      return { journey, notice: { key: "beaconDark" } };
    return {
      journey: { ...journey, beacon: true },
      notice: { key: "beaconLit" },
    };
  }
  if (id === "secret" && journey.beacon && night)
    return {
      journey: { ...journey, discovered: true },
      notice: { key: "secret" },
    };
  return {
    journey,
    notice: { key: id === "about" ? "otter" : "wind" },
  };
}
