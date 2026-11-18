CREATE TABLE "announcement" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"send_key" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"cohort" text,
	"queued_count" integer NOT NULL,
	"post_id" uuid,
	"sent_by_user_id" text,
	"sent_by_name" text NOT NULL,
	"sent_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_send_key_unique" UNIQUE("send_key"),
	CONSTRAINT "announcement_audience_known" CHECK ("announcement"."audience" in ('everyone', 'cohort'))
);
--> statement-breakpoint
ALTER TABLE "post" DROP CONSTRAINT "post_type_known";--> statement-breakpoint
ALTER TABLE "community_branding" ALTER COLUMN "accent_color" SET DEFAULT '#111110';--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_post_id_post_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."post"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_sent_by_user_id_user_id_fk" FOREIGN KEY ("sent_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_sent_at_idx" ON "announcement" USING btree ("sent_at" desc);--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_type_known" CHECK ("post"."type" in ('plain', 'ask', 'win', 'offer', 'announcement'));