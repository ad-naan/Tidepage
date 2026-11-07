/** Positions shared by scene generation and voyage navigation. */
export const coastPlaces = {
  articles: [0, 0, 0],
  notes: [-9, 0, -6],
  projects: [9, 0, -9],
  quotes: [-5, 0, 7],
  gallery: [-10, 0, -18],
  about: [9, 0, 6],
} as const;

export type PlaceId = keyof typeof coastPlaces;
