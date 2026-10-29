import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SITE_URL: z.url().default("http://localhost:3000"),
    CONTENT_SOURCE: z.enum(["demo", "postgres"]).default("demo"),
    DATABASE_URL: optionalUrl,
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    REDIS_URL: optionalUrl,
    CACHE_NAMESPACE: z
      .string()
      .regex(/^[a-zA-Z0-9:_-]+$/)
      .default("adnaan:v1"),
    CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),
    INDEXING_ENABLED: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  })
  .superRefine((env, context) => {
    let origin: URL | undefined;
    try { origin = new URL(env.SITE_URL); } catch { /* z.url reports the invalid value. */ }
    if (env.CONTENT_SOURCE === "postgres" && !env.DATABASE_URL)
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Required when CONTENT_SOURCE=postgres",
      });
    if (
      !/^https?:\/\//.test(env.SITE_URL) ||
      !origin || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password
    )
      context.addIssue({
        code: "custom",
        path: ["SITE_URL"],
        message: "Use an http(s) origin without a path, query or fragment",
      });
    if (env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(env.DATABASE_URL))
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Use a PostgreSQL connection URL",
      });
    if (env.REDIS_URL && !/^rediss?:\/\//.test(env.REDIS_URL))
      context.addIssue({
        code: "custom",
        path: ["REDIS_URL"],
        message: "Use redis:// or rediss://",
      });
    if (
      env.INDEXING_ENABLED &&
      (env.CONTENT_SOURCE !== "postgres" ||
        origin?.protocol !== "https:")
    )
      context.addIssue({
        code: "custom",
        path: ["INDEXING_ENABLED"],
        message:
          "Indexing requires PostgreSQL content and an https site origin",
      });
  });

export type ServerEnv = z.infer<typeof envSchema>;
export function parseEnv(input: Record<string, string | undefined>): ServerEnv {
  const result = envSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid environment: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    );
  return result.data;
}
