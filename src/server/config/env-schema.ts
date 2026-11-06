import { z } from "zod";

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.url().optional(),
);
const optionalOAuthValue = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(min).max(max).optional(),
  );
export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    SITE_URL: z.url().default("http://localhost:3000"),
    DATABASE_URL: z.url(),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
    UPLOAD_DIR: z.string().min(1).default("./storage/uploads"),
    REALTIME_AUTHOR_TOKEN: z.string().min(32).max(512).optional(),
    OAUTH_GITHUB_CLIENT_ID: optionalOAuthValue(1, 128),
    OAUTH_GITHUB_CLIENT_SECRET: optionalOAuthValue(8, 256),
    OAUTH_GITEE_CLIENT_ID: optionalOAuthValue(1, 128),
    OAUTH_GITEE_CLIENT_SECRET: optionalOAuthValue(8, 256),
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
    try {
      origin = new URL(env.SITE_URL);
    } catch {
      /* z.url reports the invalid value. */
    }
    if (
      !/^https?:\/\//.test(env.SITE_URL) ||
      !origin ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password
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
    if (env.INDEXING_ENABLED && origin?.protocol !== "https:")
      context.addIssue({
        code: "custom",
        path: ["INDEXING_ENABLED"],
        message: "Indexing requires an https site origin",
      });
    for (const provider of ["GITHUB", "GITEE"] as const) {
      const id = env[`OAUTH_${provider}_CLIENT_ID`];
      const secret = env[`OAUTH_${provider}_CLIENT_SECRET`];
      if (!!id !== !!secret)
        context.addIssue({
          code: "custom",
          path: [`OAUTH_${provider}_CLIENT_SECRET`],
          message: `OAUTH_${provider}_CLIENT_ID and OAUTH_${provider}_CLIENT_SECRET must be configured together`,
        });
    }
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
