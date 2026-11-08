import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getEnv } from "@/server/config/env";
import { log } from "@/server/observability/logger";
import * as schema from "./schema";
const globalDb = globalThis as unknown as { adnaanPool?: Pool };
let database: Database | undefined;
export function getPool(): Pool {
  const env = getEnv();
  if (!globalDb.adnaanPool) {
    globalDb.adnaanPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: env.DATABASE_CONNECT_TIMEOUT_MS,
      keepAlive: true,
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
function createDatabase() {
  return drizzle(getPool(), { schema });
}
export type Database = ReturnType<typeof createDatabase>;
export function getDb(): Database {
  return (database ??= createDatabase());
}
export async function closeDatabase() {
  const pool = globalDb.adnaanPool;
  delete globalDb.adnaanPool;
  database = undefined;
  if (pool) await pool.end();
}
