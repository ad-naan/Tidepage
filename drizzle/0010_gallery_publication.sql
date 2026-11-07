CREATE TABLE "gallery_photos" (
	"id" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"asset_id" text NOT NULL,
	"title" text NOT NULL,
	"caption" text NOT NULL,
	"alt" text NOT NULL,
	"place" text NOT NULL,
	"category" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"published_on" date NOT NULL,
	CONSTRAINT "gallery_photos_id_locale_pk" PRIMARY KEY("id","locale"),
	CONSTRAINT "gallery_photos_category_valid" CHECK ("gallery_photos"."category" in ('daily', 'nature', 'travel')),
	CONSTRAINT "gallery_photos_dimensions_valid" CHECK ("gallery_photos"."width" > 0 and "gallery_photos"."height" > 0)
);
--> statement-breakpoint
CREATE INDEX "gallery_photos_listing_idx" ON "gallery_photos" USING btree ("locale","sort_order","published_on" DESC NULLS LAST,"id");