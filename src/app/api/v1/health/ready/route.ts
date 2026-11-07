import { getPool } from "@/server/db/client";
import { getRedis } from "@/server/cache/redis";
import { defineRoute, jsonData } from "@/server/http/route";
export const GET = defineRoute(async (_request, { requestId }) => {
  const [postgres, redis] = await Promise.allSettled([
    getPool()
      .query("select 1")
      .then(() => "ready"),
    getRedis().then(async (client) => {
      if (!client) return "disabled";
      await client.ping();
      return "ready";
    }),
  ]);
  const ready = postgres.status === "fulfilled";
  return jsonData(
    {
      status: ready
        ? redis.status === "fulfilled"
          ? "ready"
          : "degraded"
        : "not_ready",
      dependencies: {
        postgres: ready ? postgres.value : "unavailable",
        redis: redis.status === "fulfilled" ? redis.value : "unavailable",
      },
    },
    requestId,
    { status: ready ? 200 : 503 },
  );
});
