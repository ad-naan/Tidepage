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
    name: p.name,
    x: p.position[0],
    z: p.position[2],
    radius: p.id === "quotes" ? 2 : 3.5,
  })),
  { id: "secret" as JourneyId, name: "星落湾", x: -24, z: -30, radius: 4.5 },
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
export function interactJourney(
  journey: Journey,
  id: JourneyId,
  night: boolean,
): { journey: Journey; message: string } {
  if (fragments.includes(id as Fragment)) {
    if (journey.fragments.includes(id as Fragment))
      return { journey, message: "这里的灯芯已经收好了。" };
    const found = [...journey.fragments, id as Fragment];
    return {
      journey: { ...journey, fragments: found },
      message:
        found.length === 3
          ? "三枚灯芯齐了。回灯塔，把光送出去。"
          : `找到一枚灯芯 · ${found.length} / 3`,
    };
  }
  if (id === "articles") {
    if (journey.fragments.length < 3)
      return {
        journey,
        message: "灯塔熄灭了。漂流瓶、小屋窗边、工坊里，藏着三枚灯芯。",
      };
    return {
      journey: { ...journey, beacon: true },
      message: "灯塔亮了。等到夜晚，跟随海上的蓝色微光。",
    };
  }
  if (id === "secret" && journey.beacon && night)
    return {
      journey: { ...journey, discovered: true },
      message: "你找到了星落湾。抬头，星星正在回应。",
    };
  return {
    journey,
    message:
      id === "about"
        ? "水獭望向远处的灯塔，好像在等它重新亮起来。"
        : "风从西北吹来。夜里，那边的海似乎会发光。",
  };
}
