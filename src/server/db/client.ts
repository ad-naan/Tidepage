import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getEnv } from "../config/env";
import { log } from "../observability/logger";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { adnaanPool?: Pool };
export function getPool(): Pool {
  const env = getEnv();
  if (!env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for database operations");
  if (!globalDb.adnaanPool) {
    globalDb.adnaanPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000,
      query_timeout: 6000,
      application_name: "adnaan-blog",
    });
    globalDb.adnaanPool.on("error", () =>
      log("error", "database.pool_error", { component: "postgres" }),
    );
  }
  return globalDb.adnaanPool;
}
export function getDb() {
  return drizzle(getPool(), { schema });
}
export type Database = ReturnType<typeof getDb>;
export async function closeDatabase() {
  const pool = globalDb.adnaanPool;
  delete globalDb.adnaanPool;
  if (pool) await pool.end();
}
