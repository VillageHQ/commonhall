-- Round 7 (less-choice Part 3): quiet means quiet for new members. "Let through messages and intro asks" starts off
-- for members who join from now on. Members who never saved alert choices read the default, which was on, so their
-- choice is written down first, marked as not saved by them: their time zone stays the browser's until they save.
ALTER TABLE "notification_preference" ADD COLUMN "is_saved_by_member" boolean DEFAULT true NOT NULL;--> statement-breakpoint
INSERT INTO "notification_preference" ("user_id", "let_direct_through", "is_saved_by_member")
SELECT "id", true, false FROM "user"
ON CONFLICT ("user_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "notification_preference" ALTER COLUMN "let_direct_through" SET DEFAULT false;
