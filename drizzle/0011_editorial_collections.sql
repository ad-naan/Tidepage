CREATE TABLE "friend_links" (
	"id" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"url" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "friend_links_id_locale_pk" PRIMARY KEY("id","locale")
);
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "source_owner" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "source_owner" uuid;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "source_owner" uuid;--> statement-breakpoint
CREATE INDEX "friend_links_listing_idx" ON "friend_links" USING btree ("locale","sort_order","id");