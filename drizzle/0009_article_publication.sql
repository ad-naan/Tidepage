ALTER TABLE "articles" ADD COLUMN "publication" jsonb;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_owner" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_draft" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "source_revision" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_source_idx" ON "articles" USING btree ("source_owner","source_draft","locale");