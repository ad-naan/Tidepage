CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"locale" text NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_id" uuid,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_thread_identity" UNIQUE("id","target_type","target_id","locale"),
	CONSTRAINT "comments_target_type_valid" CHECK ("comments"."target_type" in ('article', 'note', 'project', 'page')),
	CONSTRAINT "comments_body_valid" CHECK (char_length(trim("comments"."body")) between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_thread_fk" FOREIGN KEY ("parent_id","target_type","target_id","locale") REFERENCES "public"."comments"("id","target_type","target_id","locale") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comments_thread_idx" ON "comments" USING btree ("target_type","target_id","locale","created_at","id");