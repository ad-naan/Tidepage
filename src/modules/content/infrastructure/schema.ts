import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  jsonb,
  date,
  index,
  check,
} from "drizzle-orm/pg-core";
import type { Article, Category } from "../domain/models";
const publication = () => ({
  visibility: text("visibility")
    .$type<"draft" | "published">()
    .notNull()
    .default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const articlesTable = pgTable(
  "articles",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull(),
    category: text("category").$type<Category>().notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    minutes: integer("minutes").notNull(),
    sketch: text("sketch").$type<Article["sketch"]>().notNull().default("sun"),
    sections: jsonb("sections")
      .$type<Article["sections"]>()
      .notNull()
      .default([]),
    ...publication(),
  },
  (t) => [
    index("articles_publication_idx").on(t.visibility, t.publishedAt),
    index("articles_category_idx").on(t.category),
    check("articles_minutes_positive", sql`${t.minutes} > 0`),
    check(
      "articles_category_valid",
      sql`${t.category} in ('技术', '产品', '生活')`,
    ),
    check("articles_slug_valid", sql`${t.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "articles_visibility_valid",
      sql`${t.visibility} in ('draft', 'published')`,
    ),
    check(
      "articles_publication_required",
      sql`${t.visibility} != 'published' or ${t.publishedAt} is not null`,
    ),
  ],
);
export const notesTable = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    publishedOn: date("published_on").notNull(),
    mood: text("mood").notNull(),
    text: text("text").notNull(),
    tag: text("tag").notNull(),
    sketch: text("sketch").$type<Article["sketch"]>().notNull(),
    ...publication(),
  },
  (t) => [
    index("notes_publication_idx").on(t.visibility, t.publishedAt),
    check(
      "notes_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);
export const projectsTable = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    subtitle: text("subtitle").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull(),
    description: text("description").notNull(),
    stack: text("stack")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sketch: text("sketch").$type<Article["sketch"]>().notNull(),
    color: text("color").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...publication(),
  },
  (t) => [
    index("projects_publication_idx").on(t.visibility, t.sortOrder),
    check(
      "projects_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);
export const quotesTable = pgTable(
  "quotes",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    author: text("author").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...publication(),
  },
  (t) => [
    index("quotes_publication_idx").on(t.visibility, t.sortOrder),
    check(
      "quotes_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);
