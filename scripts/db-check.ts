import { config } from "dotenv";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { readFileSync } from "node:fs";
import { getPool, closeDatabase } from "../src/server/db/client";
import { migrationStatus } from "./lib/migration-status";

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
    const journal = JSON.parse(
      readFileSync("./drizzle/meta/_journal.json", "utf8"),
    ) as { entries: { when: number; tag: string }[] };
    const statuses = expected.map((migration) => ({
      name:
        journal.entries.find((entry) => entry.when === migration.folderMillis)
          ?.tag ?? String(migration.folderMillis),
      timestamp: migration.folderMillis,
      status: migrationStatus(migration, applied),
    }));
    for (const item of statuses.filter(
      (item) => item.status === "line-endings",
    ))
      console.info(`✓ ${item.name}：已迁移，仅 LF/CRLF 换行不同`);
    const pending = statuses.filter((item) => item.status === "missing");
    const changed = statuses.filter((item) => item.status === "changed");
    if (pending.length) {
      console.error(
        `缺少 ${pending.length} 项迁移记录：${pending.map((item) => item.name).join(", ")}。`,
      );
      const latest = Math.max(
        0,
        ...applied.map((row) => Number(row.created_at)),
      );
      console.error(
        pending.some((item) => item.timestamp <= latest)
          ? "存在早于已执行迁移的缺失项，自动迁移不会补跑。请核对部署版本和数据库结构，不要直接删除或补写迁移记录。"
          : "运行 pnpm run db:migrate 后重新检查。",
      );
      process.exitCode = 1;
    }
    if (changed.length) {
      console.error(
        `已执行的迁移文件内容不一致：${changed.map((item) => item.name).join(", ")}。请核对原始 SQL 与部署版本；重复迁移不会修复，不要直接修改数据库迁移记录。`,
      );
      process.exitCode = 1;
    }
    if (!pending.length && !changed.length) {
      console.info(`✓ 数据库迁移已就绪（${expected.length} 项）`);
      console.info("✓ 内容数据源：PostgreSQL");
    }
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
