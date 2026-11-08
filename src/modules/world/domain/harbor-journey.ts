import type { JourneyId } from "./coast-journey";

/** The original voyage discoveries now live in the same coordinates as the harbor. */
export const harborJourneyStops: { id: JourneyId; x: number; z: number }[] = [
  { id: "quotes", x: -34, z: 32 },
  { id: "notes", x: 3.5, z: -2.8 },
  { id: "projects", x: 34, z: 39 },
  { id: "articles", x: -18, z: -21.5 },
  { id: "gallery", x: -42, z: -49 },
  { id: "about", x: -22, z: -31 },
  { id: "secret", x: 76, z: -46 },
];
