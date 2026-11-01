export const collections = ["notes", "projects", "quotes", "gallery"] as const;
export type Collection = (typeof collections)[number];
