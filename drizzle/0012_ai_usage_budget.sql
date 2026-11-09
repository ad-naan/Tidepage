CREATE TABLE "ai_usage" (
	"scope" text NOT NULL,
	"subject" text NOT NULL,
	"day" date NOT NULL,
	"used" integer NOT NULL,
	CONSTRAINT "ai_usage_scope_subject_pk" PRIMARY KEY("scope","subject")
);
