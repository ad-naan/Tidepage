CREATE TABLE "content_interactions" (
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"locale" text NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_interactions_target_type_target_id_locale_user_id_kind_pk" PRIMARY KEY("target_type","target_id","locale","user_id","kind"),
	CONSTRAINT "interactions_kind_valid" CHECK ("content_interactions"."kind" in ('like', 'save')),
	CONSTRAINT "interactions_target_valid" CHECK ("content_interactions"."target_type" in ('article', 'note', 'project', 'page'))
);
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "images" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "content_interactions" ADD CONSTRAINT "content_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "interactions_content_idx" ON "content_interactions" USING btree ("target_type","locale","target_id");--> statement-breakpoint
CREATE INDEX "interactions_user_idx" ON "content_interactions" USING btree ("user_id","kind");