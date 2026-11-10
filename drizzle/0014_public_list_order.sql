CREATE TABLE "public_list_orders" (
	"kind" text NOT NULL,
	"locale" text NOT NULL,
	"revision" integer NOT NULL,
	"ranks" jsonb NOT NULL,
	CONSTRAINT "public_list_orders_kind_locale_pk" PRIMARY KEY("kind","locale")
);
