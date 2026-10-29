import "server-only";
import { Redis } from "ioredis";
import { getEnv } from "../config/env";
import { log } from "../observability/logger";
import { noCache, type CacheStore } from "./store";
const globalRedis = globalThis as unknown as {
  adnaanRedis?: Redis;
  adnaanRedisConnection?: Promise<void>;
};
export async function getRedis(): Promise<Redis | null> {
  const url = getEnv().REDIS_URL;
  if (!url) return null;
  if (!globalRedis.adnaanRedis) {
    globalRedis.adnaanRedis = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 1500,
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
    globalRedis.adnaanRedisConnection ??= client.connect().finally(() => {
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
export async function closeRedis() {
  globalRedis.adnaanRedis?.disconnect();
  delete globalRedis.adnaanRedis;
  delete globalRedis.adnaanRedisConnection;
}
