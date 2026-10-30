/** Structural world data only; display names live in the "world.places" message catalog. */
export const coastPlaces = [
  {
    id: "articles",
    href: "/articles",
    position: [0, 0, 0],
    anchor: [0, 7.6, 0],
  },
  {
    id: "notes",
    href: "/notes",
    position: [-9, 0, -6],
    anchor: [-9, 4, -6],
  },
  {
    id: "projects",
    href: "/projects",
    position: [9, 0, -9],
    anchor: [9, 4.7, -9],
  },
  {
    id: "quotes",
    href: "/quotes",
    position: [-5, 0, 7],
    anchor: [-5, 2.8, 7],
  },
  {
    id: "gallery",
    href: "/gallery",
    position: [-10, 0, -18],
    anchor: [-10, 4.3, -18],
  },
  {
    id: "about",
    href: "/about",
    position: [9, 0, 6],
    anchor: [9, 3.7, 6],
  },
] as const;

export type PlaceId = (typeof coastPlaces)[number]["id"];
export type WorldState = {
  place: PlaceId | null;
  night: boolean;
  paused: boolean;
};
// The scene and UI share this validated action boundary. A future agent can propose
// the same actions; it never receives arbitrary JS, selectors or navigation URLs.
export type WorldAction =
  | { type: "focus"; place: PlaceId }
  | { type: "overview" }
  | { type: "time"; night: boolean }
  | { type: "motion"; paused: boolean };

export function isWorldAction(value: unknown): value is WorldAction {
  if (!value || typeof value !== "object" || !("type" in value)) return false;
  if (value.type === "overview") return true;
  if (value.type === "focus")
    return "place" in value && coastPlaces.some((p) => p.id === value.place);
  if (value.type === "time")
    return "night" in value && typeof value.night === "boolean";
  if (value.type === "motion")
    return "paused" in value && typeof value.paused === "boolean";
  return false;
}

export function worldReducer(
  state: WorldState,
  action: WorldAction,
): WorldState {
  switch (action.type) {
    case "focus":
      return { ...state, place: action.place };
    case "overview":
      return { ...state, place: null };
    case "time":
      return { ...state, night: action.night };
    case "motion":
      return { ...state, paused: action.paused };
  }
}
