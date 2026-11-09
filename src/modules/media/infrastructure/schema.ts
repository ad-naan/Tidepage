import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  primaryKey,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import type { ImageAsset } from "@/modules/media/domain/assets";
import type { AssetCapture } from "@/modules/media/domain/photo-capture";

export const mediaAssetsTable = pgTable(
  "media_assets",
  {
    ownerId: uuid("owner_id").notNull(),
    id: text("id").notNull(),
    name: text("name").notNull(),
    mime: text("mime").$type<ImageAsset["mime"]>().notNull(),
    size: integer("size").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    capture: jsonb("capture").$type<AssetCapture>(),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.ownerId, table.id] }),
    index("media_owner_created_idx").on(table.ownerId, table.createdAt),
  ],
);
