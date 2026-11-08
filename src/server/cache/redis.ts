import "server-only";
import { Redis } from "ioredis";
import { getEnv } from "@/server/config/env";
import { log } from "@/server/observability/logger";
import { noCache, type CacheStore } from "./store";
const globalRedis = globalThis as unknown as {
  adnaanRedis?: Redis;
  adnaanRedisConnection?: Promise<void>;
  adnaanRedisRetryAt?: number;
};
export async function getRedis(): Promise<Redis | null> {
  const url = getEnv().REDIS_URL;
  if (!url) return null;
  if (!globalRedis.adnaanRedis) {
    globalRedis.adnaanRedis = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: getEnv().REDIS_CONNECT_TIMEOUT_MS,
      commandTimeout: 2000,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
    });
    globalRedis.adnaanRedis.on("error", () =>
      log("warn", "cache.connection_error", { component: "redis" }),
    );
  }
  const client = globalRedis.adnaanRedis;
  if (client.status !== "ready") {
    if ((globalRedis.adnaanRedisRetryAt ?? 0) > Date.now())
      throw new Error("Redis connection is cooling down");
    globalRedis.adnaanRedisConnection ??= client
      .connect()
      .catch((error) => {
        globalRedis.adnaanRedisRetryAt = Date.now() + 5000;
        throw error;
      })
      .finally(() => {
        delete globalRedis.adnaanRedisConnection;
      });
    await globalRedis.adnaanRedisConnection;
  }
  return client;
}
export function getCacheStore(): CacheStore {
  if (!getEnv().REDIS_URL) return noCache;
  const key = (value: string) => `${getEnv().CACHE_NAMESPACE}:${value}`;
  return {
    get: async (k) => (await getRedis())!.get(key(k)),
    set: async (k, v, ttl) => {
      await (await getRedis())!.set(key(k), v, "EX", ttl);
    },
    delete: async (k) => {
      await (await getRedis())!.del(key(k));
    },
  };
}
