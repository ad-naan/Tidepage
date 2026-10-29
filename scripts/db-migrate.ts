import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDatabase } from "../src/server/db/client";
try {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.info("Database migrations applied.");
} finally {
  await closeDatabase();
}
