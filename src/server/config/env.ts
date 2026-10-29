import "server-only";
import { parseEnv, type ServerEnv } from "./env-schema";
let value: ServerEnv | undefined;
export function getEnv(): ServerEnv {
  return (value ??= parseEnv(process.env));
}
