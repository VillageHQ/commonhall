CREATE TABLE "library_file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_id" uuid NOT NULL,
	"name" text NOT NULL,
	"bytes" "bytea" NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_file_size" CHECK (octet_length("library_file"."bytes") <= 10485760)
);
--> statement-breakpoint
CREATE TABLE "library_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"pitch" text NOT NULL,
	"kind" text NOT NULL,
	"job" text NOT NULL,
	"description" text,
	"install" text,
	"link" text,
	"visibility" text DEFAULT 'portfolio' NOT NULL,
	"version_count" integer DEFAULT 1 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"featured_at" timestamp (3) with time zone,
	"featured_by_user_id" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_item_kind_known" CHECK ("library_item"."kind" in ('skill', 'agent', 'prompt', 'tool_connection', 'automation', 'playbook')),
	CONSTRAINT "library_item_job_known" CHECK ("library_item"."job" in ('sales', 'marketing', 'engineering', 'product', 'hiring', 'finance_legal', 'support_ops', 'fundraising', 'founder')),
	CONSTRAINT "library_item_visibility_known" CHECK ("library_item"."visibility" in ('portfolio', 'fund_team', 'companies')),
	CONSTRAINT "library_item_title_length" CHECK (char_length("library_item"."title") between 1 and 120),
	CONSTRAINT "library_item_pitch_length" CHECK (char_length("library_item"."pitch") between 1 and 160)
);
--> statement-breakpoint
CREATE TABLE "library_item_company" (
	"item_id" uuid NOT NULL,
	"company_key" text NOT NULL,
	"company" text NOT NULL,
	CONSTRAINT "library_item_company_item_id_company_key_pk" PRIMARY KEY("item_id","company_key")
);
--> statement-breakpoint
CREATE TABLE "library_review" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_review_one_per_member" UNIQUE("item_id","author_id"),
	CONSTRAINT "library_review_length" CHECK (char_length("library_review"."body") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "library_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_version_number" UNIQUE("item_id","number")
);
--> statement-breakpoint
CREATE TABLE "library_vote" (
	"item_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_vote_item_id_voter_id_pk" PRIMARY KEY("item_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "content_report" DROP CONSTRAINT "content_report_target_known";--> statement-breakpoint
ALTER TABLE "library_file" ADD CONSTRAINT "library_file_version_id_library_version_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."library_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_item" ADD CONSTRAINT "library_item_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_item" ADD CONSTRAINT "library_item_featured_by_user_id_user_id_fk" FOREIGN KEY ("featured_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_item_company" ADD CONSTRAINT "library_item_company_item_id_library_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_review" ADD CONSTRAINT "library_review_item_id_library_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_review" ADD CONSTRAINT "library_review_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_version" ADD CONSTRAINT "library_version_item_id_library_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_vote" ADD CONSTRAINT "library_vote_item_id_library_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."library_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_vote" ADD CONSTRAINT "library_vote_voter_id_user_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_file_version_idx" ON "library_file" USING btree ("version_id");--> statement-breakpoint
CREATE INDEX "library_item_updated_idx" ON "library_item" USING btree ("updated_at" desc,"id" desc);--> statement-breakpoint
CREATE INDEX "library_item_author_idx" ON "library_item" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "library_review_author_idx" ON "library_review" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "library_vote_created_idx" ON "library_vote" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "library_vote_voter_idx" ON "library_vote" USING btree ("voter_id");--> statement-breakpoint
ALTER TABLE "content_report" ADD CONSTRAINT "content_report_target_known" CHECK ("content_report"."target_type" in ('post', 'comment', 'intro_note', 'ask', 'ask_answer', 'library_item'));