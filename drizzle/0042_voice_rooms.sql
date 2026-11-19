CREATE TABLE "voice_broadcast" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"room_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"host_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"access" text NOT NULL,
	"status" text NOT NULL,
	"is_broadcast" boolean DEFAULT false NOT NULL,
	"scheduled_for" timestamp (3) with time zone,
	"started_at" timestamp (3) with time zone,
	"ended_at" timestamp (3) with time zone,
	"empty_stage_since" timestamp (3) with time zone,
	"reminders_sent_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_room_access_known" CHECK ("voice_room"."access" in ('open', 'invite')),
	CONSTRAINT "voice_room_status_known" CHECK ("voice_room"."status" in ('scheduled', 'live', 'ended'))
);
--> statement-breakpoint
CREATE TABLE "voice_room_member" (
	"room_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"role" text NOT NULL,
	"is_invited" boolean DEFAULT false NOT NULL,
	"hand_raised_at" timestamp (3) with time zone,
	"joined_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_room_member_room_id_member_id_pk" PRIMARY KEY("room_id","member_id"),
	CONSTRAINT "voice_room_member_role_known" CHECK ("voice_room_member"."role" in ('host', 'cohost', 'speaker', 'listener'))
);
--> statement-breakpoint
CREATE TABLE "voice_room_reminder" (
	"room_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "voice_room_reminder_room_id_member_id_pk" PRIMARY KEY("room_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "voice_broadcast" ADD CONSTRAINT "voice_broadcast_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_broadcast" ADD CONSTRAINT "voice_broadcast_room_id_voice_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."voice_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room" ADD CONSTRAINT "voice_room_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room" ADD CONSTRAINT "voice_room_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room_member" ADD CONSTRAINT "voice_room_member_room_id_voice_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."voice_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room_member" ADD CONSTRAINT "voice_room_member_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room_reminder" ADD CONSTRAINT "voice_room_reminder_room_id_voice_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."voice_room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_room_reminder" ADD CONSTRAINT "voice_room_reminder_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "voice_broadcast_member_idx" ON "voice_broadcast" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "voice_room_status_idx" ON "voice_room" USING btree ("status");