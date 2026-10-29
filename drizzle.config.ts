import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
config({ path: [".env.local", ".env"], quiet: true });
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : {}),
  strict: true,
  verbose: true,
});
