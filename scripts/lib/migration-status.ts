import { createHash } from "node:crypto";
import type { MigrationMeta } from "drizzle-orm/migrator";

export type AppliedMigration = { hash: string; created_at: string | number };
export type MigrationStatus = "exact" | "line-endings" | "missing" | "changed";

// Drizzle hashes the original SQL bytes but decides what to execute by timestamp.
// Accept only exact LF/CRLF variants; never ignore real SQL edits or change the DB journal.
export function migrationStatus(
  migration: Pick<MigrationMeta, "hash" | "folderMillis" | "sql">,
  applied: AppliedMigration[],
): MigrationStatus {
  const recorded = applied.filter(
    (row) => Number(row.created_at) === migration.folderMillis,
  );
  if (!recorded.length) return "missing";
  if (recorded.some((row) => row.hash === migration.hash)) return "exact";

  const lf = migration.sql
    .join("--> statement-breakpoint")
    .replace(/\r\n/g, "\n");
  const hashes = [lf, lf.replace(/\n/g, "\r\n")].map((sql) =>
    createHash("sha256").update(sql).digest("hex"),
  );
  return recorded.some((row) => hashes.includes(row.hash))
    ? "line-endings"
    : "changed";
}
