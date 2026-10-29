import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });
import { getDb, closeDatabase } from "../src/server/db/client";
import {
  articles,
  projects,
} from "../src/modules/content/infrastructure/demo-data";
import {
  demoNotes,
  demoQuotes,
} from "../src/modules/content/infrastructure/demo-repository";
import {
  articlesTable,
  notesTable,
  projectsTable,
  quotesTable,
} from "../src/modules/content/infrastructure/schema";
// Explicit opt-in prevents demo fixtures from accidentally being imported into production.
if (process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is disabled in production");
try {
  await getDb().transaction(async (tx) => {
    await tx
      .insert(articlesTable)
      .values(
        articles.map((a) => ({
          slug: a.slug,
          title: a.title,
          excerpt: a.excerpt,
          category: a.category,
          tags: a.tags,
          minutes: a.minutes,
          sketch: a.sketch,
          sections: a.sections,
          visibility: "published" as const,
          publishedAt: new Date(a.date),
          updatedAt: new Date(a.date),
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(notesTable)
      .values(
        demoNotes.map(({ date: _displayDate, ...n }) => ({
          ...n,
          visibility: "published" as const,
          publishedAt: new Date(n.publishedOn),
          updatedAt: new Date(n.publishedOn),
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(projectsTable)
      .values(
        projects.map((p, i) => ({
          ...p,
          sortOrder: i,
          visibility: "published" as const,
          publishedAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(quotesTable)
      .values(
        demoQuotes.map((q, i) => ({
          ...q,
          sortOrder: i,
          visibility: "published" as const,
          publishedAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        })),
      )
      .onConflictDoNothing();
  });
  console.info("Demo content imported. Existing rows were not overwritten.");
} finally {
  await closeDatabase();
}
