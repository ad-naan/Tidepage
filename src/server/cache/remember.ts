import "server-only";
import type { z } from "zod";
import type { CacheStore } from "./store";
import { log } from "../observability/logger";
export function createRemember(store: CacheStore) {
  const pending = new Map<string, Promise<unknown>>();
  return async function remember<T>(
    key: string,
    ttl: number,
    schema: z.ZodType<T>,
    load: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await store.get(key);
      if (cached !== null) {
        const result = schema.safeParse(JSON.parse(cached));
        if (result.success) return result.data;
      }
    } catch {
      log("warn", "cache.read_bypassed", { component: "cache" });
    }
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const task = (async () => {
      // Database errors propagate. Only a failed cache is bypassed.
      const value = await load();
      try {
        await store.set(key, JSON.stringify(value), ttl);
      } catch {
        log("warn", "cache.write_bypassed", { component: "cache" });
      }
      return value;
    })();
    pending.set(key, task);
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  };
}
