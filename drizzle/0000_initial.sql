CREATE TABLE "articles" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"category" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"minutes" integer NOT NULL,
	"sketch" text DEFAULT 'sun' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_minutes_positive" CHECK ("articles"."minutes" > 0),
	CONSTRAINT "articles_category_valid" CHECK ("articles"."category" in ('技术', '产品', '生活')),
	CONSTRAINT "articles_slug_valid" CHECK ("articles"."slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "articles_visibility_valid" CHECK ("articles"."visibility" in ('draft', 'published')),
	CONSTRAINT "articles_publication_required" CHECK ("articles"."visibility" != 'published' or "articles"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text PRIMARY KEY NOT NULL,
	"published_on" date NOT NULL,
	"mood" text NOT NULL,
	"text" text NOT NULL,
	"tag" text NOT NULL,
	"sketch" text NOT NULL,
	"visibility" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notes_visibility_valid" CHECK ("notes"."visibility" in ('draft','published'))
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subtitle" text NOT NULL,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"description" text NOT NULL,
	"stack" text[] DEFAULT '{}'::text[] NOT NULL,
	"sketch" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_visibility_valid" CHECK ("projects"."visibility" in ('draft','published'))
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"author" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_visibility_valid" CHECK ("quotes"."visibility" in ('draft','published'))
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'reader' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_valid" CHECK ("users"."role" in ('reader','author','admin'))
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_publication_idx" ON "articles" USING btree ("visibility","published_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "notes_publication_idx" ON "notes" USING btree ("visibility","published_at");--> statement-breakpoint
CREATE INDEX "projects_publication_idx" ON "projects" USING btree ("visibility","sort_order");--> statement-breakpoint
CREATE INDEX "quotes_publication_idx" ON "quotes" USING btree ("visibility","sort_order");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");