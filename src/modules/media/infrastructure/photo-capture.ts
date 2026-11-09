import "server-only";
import { photoCaptureSchema, type AssetCapture } from "../domain/photo-capture";
import { nearbyPhotoCity } from "./photo-places";

/** Coordinates are used in memory to suggest a city. The returned metadata
 * contains neither coordinates nor identifying EXIF tags. */
export async function readPhotoCapture(
  exif?: Buffer,
): Promise<AssetCapture | null> {
  if (!exif) return null;
  const data =
    exif.toString("ascii", 0, 6) === "Exif\0\0" ? exif.subarray(6) : exif;
  const marker = data.toString("ascii", 0, 2);
  if (data.length < 8 || (marker !== "II" && marker !== "MM")) return null;
  const little = marker === "II";
  const short = (at: number) =>
    little ? data.readUInt16LE(at) : data.readUInt16BE(at);
  const long = (at: number) =>
    little ? data.readUInt32LE(at) : data.readUInt32BE(at);
  if (short(2) !== 42) return null;

  function directory(at: number) {
    const tags = new Map<number, number>();
    if (!Number.isInteger(at) || at < 8 || at + 2 > data.length) return tags;
    const count = short(at);
    if (count > 1024 || at + 2 + 12 * count > data.length) return tags;
    for (let index = 0; index < count; index++) {
      const entry = at + 2 + 12 * index;
      tags.set(short(entry), entry);
    }
    return tags;
  }
  function text(entry: number | undefined) {
    if (entry === undefined || short(entry + 2) !== 2) return undefined;
    const count = long(entry + 4);
    const at = count <= 4 ? entry + 8 : long(entry + 8);
    if (!count || count > 256 || at + count > data.length) return undefined;
    return (
      data
        .toString("utf8", at, at + count)
        .split("\0", 1)[0]
        .trim() || undefined
    );
  }
  function number(entry: number | undefined) {
    if (entry === undefined || long(entry + 4) !== 1) return undefined;
    const type = short(entry + 2);
    if (type === 3) return short(entry + 8);
    if (type === 4) return long(entry + 8);
    if (type !== 5) return undefined;
    return rational(long(entry + 8));
  }
  function rational(at: number) {
    if (at + 8 > data.length) return undefined;
    const denominator = long(at + 4);
    return denominator ? long(at) / denominator : undefined;
  }
  function coordinate(
    entry: number | undefined,
    ref: string | undefined,
    positive: string,
    negative: string,
    max: number,
  ) {
    if (
      entry === undefined ||
      short(entry + 2) !== 5 ||
      long(entry + 4) !== 3 ||
      (ref !== positive && ref !== negative)
    )
      return undefined;
    const at = long(entry + 8);
    const degrees = rational(at);
    const minutes = rational(at + 8);
    const seconds = rational(at + 16);
    if (
      degrees === undefined ||
      minutes === undefined ||
      seconds === undefined ||
      minutes >= 60 ||
      seconds >= 60
    )
      return undefined;
    const value = degrees + minutes / 60 + seconds / 3600;
    return value <= max ? (ref === negative ? -value : value) : undefined;
  }
  const equipment = directory(long(4));
  const exposure = directory(number(equipment.get(0x8769)) ?? 0);
  const make = text(equipment.get(0x010f));
  const model = text(equipment.get(0x0110));
  const camera =
    model && make && !model.toLowerCase().startsWith(make.toLowerCase())
      ? `${make} ${model}`
      : (model ?? make);
  const value = {
    camera,
    lens: text(exposure.get(0xa434)),
    focalLength: number(exposure.get(0x920a)),
    aperture: number(exposure.get(0x829d)),
    exposureSeconds: number(exposure.get(0x829a)),
    iso: number(exposure.get(0x8827)) ?? number(exposure.get(0x8833)),
  };
  const capture: AssetCapture = {};
  for (const key of Object.keys(value) as (keyof typeof value)[]) {
    const result = photoCaptureSchema.shape[key].safeParse(value[key]);
    if (result.success && result.data !== undefined)
      Object.assign(capture, { [key]: result.data });
  }
  const gps = directory(number(equipment.get(0x8825)) ?? 0);
  const latitude = coordinate(gps.get(2), text(gps.get(1)), "N", "S", 90);
  const longitude = coordinate(gps.get(4), text(gps.get(3)), "E", "W", 180);
  if (latitude !== undefined && longitude !== undefined) {
    const city = await nearbyPhotoCity(latitude, longitude);
    if (city) capture.locality = city;
  }
  return Object.keys(capture).length ? capture : null;
}
