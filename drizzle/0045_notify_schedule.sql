CREATE TABLE "notification_quiet_time" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"from" text NOT NULL,
	"to" text NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"days" integer[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "paused_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD COLUMN "let_direct_through" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_quiet_time" ADD CONSTRAINT "notification_quiet_time_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_quiet_time_user_idx" ON "notification_quiet_time" USING btree ("user_id");--> statement-breakpoint
-- A single quiet window that was switched on becomes the member's first quiet time, unchanged. The old quiet_*
-- columns stay (nothing reads them) so a revert loses nothing; a later release drops them.
INSERT INTO "notification_quiet_time" ("user_id", "from", "to", "all_day", "days")
SELECT "user_id", "quiet_from", "quiet_to", false, "quiet_days"
FROM "notification_preference"
WHERE "quiet_is_on" AND cardinality("quiet_days") > 0 AND "quiet_from" <> "quiet_to";
