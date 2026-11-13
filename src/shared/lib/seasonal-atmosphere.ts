import { siteClockParts, type DateInput } from "./date-time";

export type Season = "spring" | "summer" | "autumn" | "winter";
export type Daylight = "dawn" | "day" | "dusk" | "night";
export function seasonalAtmosphere(now: DateInput) {
  const clock = siteClockParts(now);
  if (!clock) return null;
  const { month, hour } = clock;
  const season: Season =
    month >= 3 && month <= 5
      ? "spring"
      : month >= 6 && month <= 8
        ? "summer"
        : month >= 9 && month <= 11
          ? "autumn"
          : "winter";
  const daylight: Daylight =
    hour >= 5 && hour < 8
      ? "dawn"
      : hour >= 8 && hour < 17
        ? "day"
        : hour >= 17 && hour < 20
          ? "dusk"
          : "night";
  return { season, daylight };
}
