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
  primaryKey,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Locale } from "@/shared/i18n/config";
import type { Article, Category } from "@/modules/content/domain/models";
import type { NoteImage } from "@/modules/content/domain/note-images";
import type { GalleryPhoto } from "@/modules/content/domain/gallery";
const publication = () => ({
  locale: text("locale").$type<Locale>().notNull().default("zh-CN"),
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
    slug: text("slug").notNull(),
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
    body: jsonb("body").$type<Article["body"]>(),
    publication: jsonb("publication").$type<Article["publication"]>(),
    sourceOwner: text("source_owner"),
    sourceDraft: text("source_draft"),
    sourceRevision: integer("source_revision"),
    ...publication(),
  },
  (t) => [
    primaryKey({ columns: [t.slug, t.locale] }),
    uniqueIndex("articles_source_idx").on(
      t.sourceOwner,
      t.sourceDraft,
      t.locale,
    ),
    index("articles_publication_idx").on(t.locale, t.visibility, t.publishedAt),
    index("articles_category_idx").on(t.category),
    check("articles_minutes_positive", sql`${t.minutes} > 0`),
    check(
      "articles_category_valid",
      sql`${t.category} in ('technology', 'product', 'life')`,
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
    id: text("id").notNull(),
    sourceOwner: uuid("source_owner"),
    publishedOn: date("published_on").notNull(),
    mood: text("mood").notNull(),
    text: text("text").notNull(),
    body: jsonb("body").$type<Article["body"]>(),
    images: jsonb("images").$type<NoteImage[]>().notNull().default([]),
    tag: text("tag").notNull(),
    sketch: text("sketch").$type<Article["sketch"]>().notNull(),
    ...publication(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.locale] }),
    index("notes_publication_idx").on(t.locale, t.visibility, t.publishedAt),
    check(
      "notes_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);
export const projectsTable = pgTable(
  "projects",
  {
    id: text("id").notNull(),
    sourceOwner: uuid("source_owner"),
    name: text("name").notNull(),
    subtitle: text("subtitle").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull(),
    description: text("description").notNull(),
    body: jsonb("body").$type<Article["body"]>(),
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
    primaryKey({ columns: [t.id, t.locale] }),
    index("projects_publication_idx").on(t.locale, t.visibility, t.sortOrder),
    check(
      "projects_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);
export const quotesTable = pgTable(
  "quotes",
  {
    id: text("id").notNull(),
    sourceOwner: uuid("source_owner"),
    text: text("text").notNull(),
    author: text("author").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...publication(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.locale] }),
    index("quotes_publication_idx").on(t.locale, t.visibility, t.sortOrder),
    check(
      "quotes_visibility_valid",
      sql`${t.visibility} in ('draft','published')`,
    ),
  ],
);

export const galleryPhotosTable = pgTable(
  "gallery_photos",
  {
    id: text("id").notNull(),
    ownerId: uuid("owner_id").notNull(),
    locale: text("locale").$type<Locale>().notNull(),
    assetId: text("asset_id").notNull(),
    title: text("title").notNull(),
    caption: text("caption").notNull(),
    alt: text("alt").notNull(),
    place: text("place").notNull(),
    category: text("category").$type<GalleryPhoto["category"]>().notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    capture: jsonb("capture").$type<NonNullable<GalleryPhoto["capture"]>>(),
    sortOrder: integer("sort_order").notNull(),
    publishedOn: date("published_on").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id, table.locale] }),
    index("gallery_photos_listing_idx").on(
      table.locale,
      table.sortOrder,
      table.publishedOn.desc(),
      table.id,
    ),
    check(
      "gallery_photos_category_valid",
      sql`${table.category} in ('daily', 'nature', 'travel')`,
    ),
    check(
      "gallery_photos_dimensions_valid",
      sql`${table.width} > 0 and ${table.height} > 0`,
    ),
  ],
);
