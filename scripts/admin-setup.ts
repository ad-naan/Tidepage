import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { config, parse } from "dotenv";
import { Pool } from "pg";

config({ path: [".env.local", ".env"], quiet: true });
const existing = fs.existsSync(".env.local")
  ? fs.readFileSync(".env.local", "utf8")
  : "";
const local = parse(existing);
if (local.ADMIN_ACCESS_KEY && local.ADMIN_USER_ID) {
  console.info("Author access is already configured in .env.local.");
} else {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  try {
    const result = await pool.query<{ id: string }>(
      "INSERT INTO users (display_name, role) VALUES ($1, 'admin') RETURNING id",
      ["adnaan"],
    );
    const lines = [
      existing.trimEnd(),
      `ADMIN_USER_ID=${result.rows[0].id}`,
      `ADMIN_ACCESS_KEY=${randomBytes(32).toString("hex")}`,
    ];
    fs.writeFileSync(".env.local", lines.filter(Boolean).join("\n") + "\n", {
      mode: 0o600,
    });
    console.info(
      "Author configured. The access key is in .env.local (not printed). Restart the application.",
    );
  } finally {
    await pool.end();
  }
}
