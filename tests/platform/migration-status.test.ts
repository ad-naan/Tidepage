import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { migrationStatus } from "../../scripts/lib/migration-status";

const hash = (sql: string) => createHash("sha256").update(sql).digest("hex");
const lf =
  'ALTER TABLE "articles" ADD "locale" text;--> statement-breakpoint\nSELECT 1;\n';
const crlf = lf.replace(/\n/g, "\r\n");
const migration = (sql: string, timestamp = 100) => ({
  sql: sql.split("--> statement-breakpoint"),
  hash: hash(sql),
  folderMillis: timestamp,
});

test("migration audit accepts exact SQL and historical LF/CRLF variants in either direction", () => {
  assert.equal(
    migrationStatus(migration(lf), [{ hash: hash(lf), created_at: "100" }]),
    "exact",
  );
  assert.equal(
    migrationStatus(migration(lf), [{ hash: hash(crlf), created_at: "100" }]),
    "line-endings",
  );
  assert.equal(
    migrationStatus(migration(crlf), [{ hash: hash(lf), created_at: 100 }]),
    "line-endings",
  );
});

test("migration audit still rejects SQL edits and requires the matching journal timestamp", () => {
  const recorded = [{ hash: hash(crlf), created_at: "100" }];
  assert.equal(
    migrationStatus(migration(lf.replace("SELECT 1", "SELECT 2")), recorded),
    "changed",
  );
  assert.equal(migrationStatus(migration(lf.trimEnd()), recorded), "changed");
  assert.equal(migrationStatus(migration(lf, 101), recorded), "missing");
  assert.equal(migrationStatus(migration(lf), []), "missing");
});
