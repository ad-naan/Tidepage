import "server-only";
import { isIP } from "node:net";
import { getRedis } from "@/server/cache/redis";
import { getEnv } from "@/server/config/env";
import { log } from "@/server/observability/logger";
import { tooManyRequestsError } from "./errors";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const maxBuckets = 10_000;
let nextSweep = 0;
let redisRetryAt = 0;

function result(count: number, limit: number, ttl: number): RateLimitResult {
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
  };
}

export function clientKey(
  request: Request,
  trustProxy = getEnv().TRUST_PROXY_CLIENT_IP,
): string {
  const address = trustProxy && request.headers.get("x-real-ip")?.trim();
  return address && isIP(address) ? address : "anonymous";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  if (now >= nextSweep) {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(id);
    }
    nextSweep = now + 1000;
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= maxBuckets)
      return result(limit + 1, limit, 1000);
    bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
    buckets.set(key, bucket);
  }
  bucket.count = Math.min(bucket.count + 1, limit + 1);
  return result(bucket.count, limit, bucket.resetAt - now);
}

// The increment and expiration happen together across all Web replicas.
const take = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

async function enforce(key: string, limit: number, windowSeconds: number) {
  const env = getEnv();
  let decision: RateLimitResult | undefined;
  if (env.REDIS_URL && Date.now() >= redisRetryAt) {
    try {
      const redis = (await getRedis())!;
      const [count, ttl] = (await redis.eval(
        take,
        1,
        `${env.CACHE_NAMESPACE}:rate:${key}`,
        windowSeconds * 1000,
      )) as [number, number];
      decision = result(count, limit, ttl);
    } catch {
      if (Date.now() >= redisRetryAt)
        log("warn", "rate_limit.local_fallback", { component: "redis" });
      redisRetryAt = Date.now() + 5000;
    }
  }
  decision ??= checkRateLimit(key, limit, windowSeconds);
  if (!decision.allowed) throw tooManyRequestsError(decision.retryAfterSeconds);
  return decision;
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  return enforce(`client:${scope}:${clientKey(request)}`, limit, windowSeconds);
}

export function enforceAccountRateLimit(
  accountId: string,
  scope: string,
  limit: number,
  windowSeconds: number,
) {
  return enforce(`account:${scope}:${accountId}`, limit, windowSeconds);
}
