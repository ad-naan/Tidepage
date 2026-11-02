import { z } from "zod";
export const gatewayConfigSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.coerce.number().int().min(0).max(65535).default(3101),
  token: z.string().min(32).max(512),
  origins: z.array(z.url()).min(1),
  redisUrl: z.url().optional(),
  namespace: z
    .string()
    .regex(/^[a-zA-Z0-9:_-]+$/)
    .default("adnaan:v1"),
});
export type GatewayConfig = z.infer<typeof gatewayConfigSchema>;
export function readGatewayConfig(
  env: Record<string, string | undefined> = process.env,
): GatewayConfig {
  const c = gatewayConfigSchema.parse({
    host: env.REALTIME_HOST,
    port: env.REALTIME_PORT,
    token: env.REALTIME_AUTHOR_TOKEN,
    origins: (env.REALTIME_ORIGINS ?? env.SITE_URL ?? "http://localhost:3000")
      .split(",")
      .map((s) => s.trim()),
    redisUrl: env.REDIS_URL || undefined,
    namespace: env.CACHE_NAMESPACE,
  });
  if (env.NODE_ENV === "production" && !c.redisUrl)
    throw new Error("Production realtime requires Redis");
  for (const origin of c.origins) {
    const u = new URL(origin);
    if (!/^https?:$/.test(u.protocol) || u.origin !== origin)
      throw new Error("Use exact HTTP(S) origins");
  }
  if (c.redisUrl && !/^rediss?:\/\//.test(c.redisUrl))
    throw new Error("Use a Redis URL");
  return c;
}
