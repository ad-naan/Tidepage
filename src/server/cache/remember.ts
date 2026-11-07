import "server-only";
import type { z } from "zod";
import type { CacheStore } from "./store";
import { log } from "@/server/observability/logger";
export function createRemember(store: CacheStore) {
  const pending = new Map<string, Promise<unknown>>();
  const nextWarning = { read: 0, write: 0 };
  function warn(operation: keyof typeof nextWarning) {
    const now = Date.now();
    if (now < nextWarning[operation]) return;
    nextWarning[operation] = now + 60_000;
    log("warn", `cache.${operation}_bypassed`, { component: "cache" });
  }
  return async function remember<T>(
    key: string,
    ttl: number,
    schema: z.ZodType<T>,
    load: () => Promise<T>,
  ): Promise<T> {
    const existing = pending.get(key);
    if (existing) return existing as Promise<T>;
    const task = (async () => {
      try {
        const cached = await store.get(key);
        if (cached !== null) {
          const result = schema.safeParse(JSON.parse(cached));
          if (result.success) return result.data;
        }
      } catch {
        warn("read");
      }
      // Database errors propagate. Only a failed cache is bypassed.
      const value = await load();
      try {
        await store.set(key, JSON.stringify(value), ttl);
      } catch {
        warn("write");
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
