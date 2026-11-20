ALTER TABLE "library_item" ALTER COLUMN "job" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ask" ADD COLUMN "hiring_job_id" uuid;