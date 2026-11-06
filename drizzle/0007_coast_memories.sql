CREATE TABLE "coast_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"place" text NOT NULL,
	"day" date NOT NULL,
	"with_host" boolean DEFAULT false NOT NULL,
	"companion_count" integer DEFAULT 0 NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coast_memories_owner_source" UNIQUE("user_id","source"),
	CONSTRAINT "coast_memories_kind_valid" CHECK ("coast_memories"."kind" in ('visit','photo')),
	CONSTRAINT "coast_memories_place_valid" CHECK ("coast_memories"."place" in ('dock','beach','bench','cottage')),
	CONSTRAINT "coast_memories_count_valid" CHECK ("coast_memories"."companion_count" between 0 and 11),
	CONSTRAINT "coast_memories_source_valid" CHECK (char_length("coast_memories"."source") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "coast_memories" ADD CONSTRAINT "coast_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coast_memories_owner_created_idx" ON "coast_memories" USING btree ("user_id","created_at","id");