import catalog from "./stickers.json";

export const stickers = catalog;
const byId = new Map(stickers.map((sticker) => [sticker.id, sticker]));
export function getSticker(id: unknown) {
  return typeof id === "string" ? byId.get(id) : undefined;
}
