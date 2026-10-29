export const coastPlaces = [
  {
    id: "articles",
    name: "灯塔",
    kind: "文章",
    description: "那些反复想过的问题，在这里亮着灯。",
    href: "/articles",
    position: [0, 0, 0],
    anchor: [0, 7.6, 0],
  },
  {
    id: "notes",
    name: "海边小屋",
    kind: "手记",
    description: "推开窗，有一些还没有写成文章的日常。",
    href: "/notes",
    position: [-9, 0, -6],
    anchor: [-9, 4, -6],
  },
  {
    id: "projects",
    name: "造物工坊",
    kind: "项目",
    description: "好奇心在这里动手，把小念头做成真的。",
    href: "/projects",
    position: [9, 0, -9],
    anchor: [9, 4.7, -9],
  },
  {
    id: "quotes",
    name: "漂流湾",
    kind: "一言",
    description: "海浪送来一句话。也许刚好是你今天需要的。",
    href: "/quotes",
    position: [-5, 0, 7],
    anchor: [-5, 2.8, 7],
  },
  {
    id: "gallery",
    name: "观景台",
    kind: "照片",
    description: "让风停一会儿，看看那些值得留下的瞬间。",
    href: "/gallery",
    position: [-10, 0, -18],
    anchor: [-10, 4.3, -18],
  },
  {
    id: "about",
    name: "来信码头",
    kind: "自述",
    description: "有一封写给来访者的信，水獭替我保管着。",
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
