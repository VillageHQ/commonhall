CREATE TABLE "notification_device" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"address" text NOT NULL,
	"p256dh" text,
	"auth" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sent_at" timestamp with time zone,
	CONSTRAINT "notification_device_address_unique" UNIQUE("address"),
	CONSTRAINT "notification_device_type" CHECK ("notification_device"."type" in ('webpush', 'expo'))
);
--> statement-breakpoint
CREATE TABLE "notification_mute" (
	"user_id" text NOT NULL,
	"muted_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_mute_user_id_muted_user_id_pk" PRIMARY KEY("user_id","muted_user_id")
);
--> statement-breakpoint
CREATE TABLE "notification_preference" (
	"user_id" text PRIMARY KEY NOT NULL,
	"is_on" boolean DEFAULT true NOT NULL,
	"off_kinds" text[] DEFAULT '{}'::text[] NOT NULL,
	"quiet_is_on" boolean DEFAULT false NOT NULL,
	"quiet_from" text DEFAULT '22:00' NOT NULL,
	"quiet_to" text DEFAULT '07:00' NOT NULL,
	"quiet_days" integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[] NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notification_device" ADD CONSTRAINT "notification_device_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_mute" ADD CONSTRAINT "notification_mute_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_mute" ADD CONSTRAINT "notification_mute_muted_user_id_user_id_fk" FOREIGN KEY ("muted_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_device_user_idx" ON "notification_device" USING btree ("user_id");