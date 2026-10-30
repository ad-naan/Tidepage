import "server-only";
import { tooManyRequestsError } from "./errors";

/**
 * 固定窗口限流（单实例内存实现）。
 *
 * 直接在 defineRoute 处理器中调用 enforceRateLimit，超限抛出
 * RATE_LIMITED（429），由统一错误管道转换为本地化响应。
 * 多实例部署时应替换为 Redis INCR + TTL 实现，接口保持不变。
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

type Bucket = { count: number; resetAt: number };
type GlobalLimiter = { adnaanRateBuckets?: Map<string, Bucket> };
const globalLimiter = globalThis as unknown as GlobalLimiter;

function buckets(): Map<string, Bucket> {
  return (globalLimiter.adnaanRateBuckets ??= new Map());
}

/**
 * 尽力提取客户端标识。仅在受信任的反向代理之后有意义；
 * 直连部署时所有匿名请求会共享同一个桶。
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "anonymous";
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  const store = buckets();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // 惰性清理过期桶，避免为每个请求全量扫描。
    if (store.size > 10_000) {
      for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
    }
    store.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return {
      allowed: true,
      remaining: limit - 1,
      retryAfterSeconds: windowSeconds,
    };
  }
  bucket.count += 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((bucket.resetAt - now) / 1000),
  );
  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds,
  };
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const result = checkRateLimit(
    `${scope}:${clientKey(request)}`,
    limit,
    windowSeconds,
  );
  if (!result.allowed) throw tooManyRequestsError(result.retryAfterSeconds);
  return result;
}
