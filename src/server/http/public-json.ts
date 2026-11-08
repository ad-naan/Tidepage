import "server-only";
import { readPublicText } from "./public-text";

export async function readPublicJson(
  value: string,
  signal: AbortSignal,
): Promise<unknown> {
  return JSON.parse(await readPublicText(value, signal, "json")) as unknown;
}
