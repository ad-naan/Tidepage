import type { Article } from "../../src/modules/content/domain/models";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import type { Database } from "../../src/server/db/client";
import { postgresContentRepository } from "../../src/modules/content/infrastructure/postgres-repository";
import { createContentService } from "../../src/modules/content/application/service";

// Fixtures exist only in tests and never enter the application's import graph.
export const articleFixtures: Article[] = (["zh-CN", "en"] as const).map(
  (locale) => ({
    locale,
    slug: "fixture-article",
    title: `AI fixture (${locale})`,
    excerpt: "Test excerpt",
    category: "technology",
    tags: ["AI"],
    minutes: 3,
    sketch: "boat",
    date: "2020-01-01",
    updatedAt: "2020-01-02T00:00:00.000Z",
    sections: [
      {
        title: "Fixture section",
        paragraphs: ["Test paragraph"],
        blocks: [
          {
            type: "movie",
            url: "https://example.com/movie",
            title: "Fixture film",
            year: 2020,
            director: "Test director",
            note: "Test note",
          },
        ],
      },
    ],
  }),
);
export async function createContentTestStore() {
  const pg = new PGlite();
  const migrations = new URL("../../drizzle/", import.meta.url);
  try {
    for (const name of (await readdir(migrations))
      .filter((name) => name.endsWith(".sql"))
      .sort())
      await pg.exec(await readFile(new URL(name, migrations), "utf8"));
    const db = drizzle(pg);
    const repository = postgresContentRepository(db as unknown as Database);
    return {
      db,
      service: createContentService(repository),
      close: () => pg.close(),
    };
  } catch (error) {
    await pg.close();
    throw error;
  }
}
