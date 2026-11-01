import { config } from "dotenv";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { getPool, closeDatabase } from "../src/server/db/client";

config({ path: [".env.local", ".env"], quiet: true });

// Read-only: never migrate, seed, or print the connection string.
try {
  if (!process.env.DATABASE_URL) {
    console.error(
      "未配置 DATABASE_URL。请在 .env 或 .env.local 中填写 PostgreSQL 连接信息。",
    );
    process.exitCode = 1;
  } else {
    const pool = getPool();
    await pool.query("select 1");
    console.info("✓ PostgreSQL 连接成功");
    const { rows } = await pool.query<{ journal: string | null }>(
      "select to_regclass('drizzle.__drizzle_migrations')::text as journal",
    );
    const expected = readMigrationFiles({ migrationsFolder: "./drizzle" });
    const applied = rows[0]?.journal
      ? (
          await pool.query<{ hash: string; created_at: string }>(
            "select hash, created_at from drizzle.__drizzle_migrations order by created_at",
          )
        ).rows
      : [];
    const pending = expected.filter(
      (migration) =>
        !applied.some(
          (row) =>
            row.hash === migration.hash &&
            Number(row.created_at) === migration.folderMillis,
        ),
    );
    if (pending.length) {
      console.error(
        `还有 ${pending.length} 项数据库迁移未完成。运行 pnpm run db:migrate 后重新检查。`,
      );
      process.exitCode = 1;
    } else {
      console.info(`✓ 数据库迁移已就绪（${expected.length} 项）`);
    }
    if (!pending.length) console.info("✓ 内容数据源：PostgreSQL");
  }
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "UNKNOWN";
  if (code === "28P01" || code === "28000")
    console.error(
      "PostgreSQL 已响应，但账号或密码不正确。请修改 .env 中的 DATABASE_URL；如有 .env.local，以其配置为准。不要把密码发到聊天里。",
    );
  else if (code === "3D000")
    console.error(
      "数据库不存在。请先创建 DATABASE_URL 指定的数据库，再运行迁移。",
    );
  else if (code === "ECONNREFUSED" || code === "ETIMEDOUT")
    console.error("无法连接 PostgreSQL。请先启动数据库，并核对地址与端口。");
  else
    console.error(
      `数据库检查失败（${code}）。请核对配置和迁移；未输出连接信息。`,
    );
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
