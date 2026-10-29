import { getEnv } from "@/server/config/env";
import { getPool } from "@/server/db/client";
import { getRedis } from "@/server/cache/redis";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (_request, { requestId }) => {
  const env = getEnv();
  const checks = await Promise.allSettled([
    env.DATABASE_URL
      ? getPool()
          .query("select 1")
          .then(() => "ready")
      : Promise.resolve("disabled"),
    env.REDIS_URL
      ? getRedis()
          .then((client) => client!.ping())
          .then(() => "ready")
      : Promise.resolve("disabled"),
  ]);
  const ready = checks.every((c) => c.status === "fulfilled");
  const status = (i: number) =>
    checks[i].status === "fulfilled" ? checks[i].value : "unavailable";
  return jsonData(
    {
      status: ready ? "ready" : "not_ready",
      dependencies: { postgres: status(0), redis: status(1) },
    },
    requestId,
    { status: ready ? 200 : 503 },
  );
});
