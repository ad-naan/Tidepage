ALTER TABLE "articles" DROP CONSTRAINT "articles_category_valid";--> statement-breakpoint
DROP INDEX "articles_publication_idx";--> statement-breakpoint
DROP INDEX "notes_publication_idx";--> statement-breakpoint
DROP INDEX "projects_publication_idx";--> statement-breakpoint
DROP INDEX "quotes_publication_idx";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "locale" text DEFAULT 'zh-CN' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" DROP CONSTRAINT "articles_pkey";--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "notes_pkey";--> statement-breakpoint
ALTER TABLE "projects" DROP CONSTRAINT "projects_pkey";--> statement-breakpoint
ALTER TABLE "quotes" DROP CONSTRAINT "quotes_pkey";--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_slug_locale_pk" PRIMARY KEY("slug","locale");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_id_locale_pk" PRIMARY KEY("id","locale");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_locale_pk" PRIMARY KEY("id","locale");--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_id_locale_pk" PRIMARY KEY("id","locale");--> statement-breakpoint
UPDATE "articles" SET "category" = CASE "category"
  WHEN '技术' THEN 'technology'
  WHEN '产品' THEN 'product'
  WHEN '生活' THEN 'life'
  ELSE "category" END;--> statement-breakpoint
UPDATE "projects" SET "category" = CASE "category"
  WHEN '产品' THEN 'product'
  WHEN '开源' THEN 'open-source'
  WHEN '实验' THEN 'experiment'
  ELSE "category" END;--> statement-breakpoint
CREATE INDEX "articles_publication_idx" ON "articles" USING btree ("locale","visibility","published_at");--> statement-breakpoint
CREATE INDEX "notes_publication_idx" ON "notes" USING btree ("locale","visibility","published_at");--> statement-breakpoint
CREATE INDEX "projects_publication_idx" ON "projects" USING btree ("locale","visibility","sort_order");--> statement-breakpoint
CREATE INDEX "quotes_publication_idx" ON "quotes" USING btree ("locale","visibility","sort_order");--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_valid" CHECK ("articles"."category" in ('technology', 'product', 'life'));