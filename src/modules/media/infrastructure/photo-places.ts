import "server-only";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { AssetCapture } from "../domain/photo-capture";

type City = [latitude: number, longitude: number, name: string, zh?: string];
let index: Promise<City[]> | undefined;

export async function nearbyPhotoCity(
  latitude: number,
  longitude: number,
): Promise<AssetCapture["locality"]> {
  index ??= readFile(
    resolve("src/modules/media/infrastructure/data/photo-cities.tsv.gz"),
  ).then((data) =>
    gunzipSync(data)
      .toString("utf8")
      .trimEnd()
      .split("\n")
      .map((line): City => {
        const [lat, lon, name, zh] = line.split("\t");
        return [Number(lat), Number(lon), name, zh || undefined];
      }),
  );
  const cities = await index.catch(() => {
    index = undefined;
    return [];
  });
  const radians = Math.PI / 180;
  const cosLatitude = Math.cos(latitude * radians);
  // Haversine threshold for roughly 25 km. Rural or ambiguous photos can
  // leave location blank, and the user can override the closest-city label.
  let limit = Math.sin(25 / (2 * 6371)) ** 2;
  let nearest: City | undefined;
  for (const city of cities) {
    const latGap = city[0] - latitude;
    if (Math.abs(latGap) > 0.23) continue;
    const lonGap = city[1] - longitude;
    const distance =
      Math.sin((latGap * radians) / 2) ** 2 +
      cosLatitude *
        Math.cos(city[0] * radians) *
        Math.sin((lonGap * radians) / 2) ** 2;
    if (distance >= limit) continue;
    nearest = city;
    limit = distance;
  }
  return nearest && { name: nearest[2], zh: nearest[3] };
}
