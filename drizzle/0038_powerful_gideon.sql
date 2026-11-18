CREATE TABLE "call_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" text,
	"member_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "community_branding" ALTER COLUMN "accent_color" SET DEFAULT '#111110';--> statement-breakpoint
ALTER TABLE "invite" ADD COLUMN "community_role" text;--> statement-breakpoint
ALTER TABLE "member_profile" ADD COLUMN "community_role" text DEFAULT 'founder' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_profile" ADD COLUMN "booking_url" text;--> statement-breakpoint
ALTER TABLE "member_profile" ADD COLUMN "booking_visibility" text DEFAULT 'community' NOT NULL;--> statement-breakpoint
ALTER TABLE "call_request" ADD CONSTRAINT "call_request_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_request" ADD CONSTRAINT "call_request_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "call_request_created_at_idx" ON "call_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "call_request_member_id_idx" ON "call_request" USING btree ("member_id");--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_community_role" CHECK ("invite"."community_role" is null or "invite"."community_role" in ('founder', 'mentor', 'expert', 'advisor', 'entrepreneur_in_residence', 'fund_team'));--> statement-breakpoint
ALTER TABLE "member_profile" ADD CONSTRAINT "member_profile_community_role" CHECK ("member_profile"."community_role" in ('founder', 'mentor', 'expert', 'advisor', 'entrepreneur_in_residence', 'fund_team'));--> statement-breakpoint
ALTER TABLE "member_profile" ADD CONSTRAINT "member_profile_booking_visibility" CHECK ("member_profile"."booking_visibility" in ('community', 'introduced'));--> statement-breakpoint
ALTER TABLE "member_profile" ADD CONSTRAINT "member_profile_booking_url_https" CHECK ("member_profile"."booking_url" is null or "member_profile"."booking_url" like 'https://%');