CREATE TABLE "voice_follow" (
	"follower_id" text NOT NULL,
	"followed_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_follow_follower_id_followed_id_pk" PRIMARY KEY("follower_id","followed_id")
);
--> statement-breakpoint
CREATE TABLE "voice_notify_choice" (
	"member_id" text PRIMARY KEY NOT NULL,
	"audience" text NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_notify_choice_audience_known" CHECK ("voice_notify_choice"."audience" in ('off', 'followers', 'picked', 'everyone'))
);
--> statement-breakpoint
CREATE TABLE "voice_notify_receipt" (
	"room_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_notify_receipt_room_id_member_id_pk" PRIMARY KEY("room_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "voice_broadcast" ADD COLUMN "audience" text;--> statement-breakpoint
ALTER TABLE "voice_broadcast" ADD COLUMN "reached" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "voice_room" ADD COLUMN "notify_audience" text;--> statement-breakpoint
ALTER TABLE "voice_room" ADD COLUMN "notify_member_ids" jsonb;--> statement-breakpoint
ALTER TABLE "voice_follow" ADD CONSTRAINT "voice_follow_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_follow" ADD CONSTRAINT "voice_follow_followed_id_user_id_fk" FOREIGN KEY ("followed_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notify_choice" ADD CONSTRAINT "voice_notify_choice_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notify_receipt" ADD CONSTRAINT "voice_notify_receipt_room_id_voice_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."voice_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notify_receipt" ADD CONSTRAINT "voice_notify_receipt_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_notify_receipt" ADD CONSTRAINT "voice_notify_receipt_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_follow_followed_idx" ON "voice_follow" USING btree ("followed_id");--> statement-breakpoint
CREATE INDEX "voice_notify_receipt_member_idx" ON "voice_notify_receipt" USING btree ("member_id","created_at");--> statement-breakpoint
ALTER TABLE "voice_broadcast" ADD CONSTRAINT "voice_broadcast_audience_known" CHECK ("voice_broadcast"."audience" is null or "voice_broadcast"."audience" in ('followers', 'picked', 'everyone'));--> statement-breakpoint
ALTER TABLE "voice_room" ADD CONSTRAINT "voice_room_notify_audience_known" CHECK ("voice_room"."notify_audience" is null or "voice_room"."notify_audience" in ('followers', 'picked', 'everyone'));