import "server-only";
import { AppError } from "./errors";
import { getEnv } from "../config/env";
// Call before every cookie-authenticated mutation; never trust a forwarded host.
export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(getEnv().SITE_URL).origin)
    throw new AppError("INVALID_ORIGIN", "请求来源不合法", 403);
}
