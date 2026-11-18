import { desc, sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { REPORT_TARGETS } from "./contract.ts";
import { FEED_LIMITS } from "../feed/contract.ts";
import { post } from "../feed/schema.ts";
import { ANNOUNCEMENT_AUDIENCES } from "./contract-announcements.ts";
import { user } from "../../platform/database/auth-schema.ts";

const MILLISECOND_PRECISION = 3;

function adminTimestamp(name: string) {
  return timestamp(name, { withTimezone: true, precision: MILLISECOND_PRECISION });
}

export const contentReport = pgTable(
  "content_report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reporterId: text("reporter_id").references(() => user.id, { onDelete: "set null" }),
    reportedMemberId: text("reported_member_id").references(() => user.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    contentCreatedAt: adminTimestamp("content_created_at").notNull(),
    createdAt: adminTimestamp("created_at").notNull().defaultNow(),
    resolution: text("resolution"),
    resolvedAt: adminTimestamp("resolved_at"),
    resolvedByUserId: text("resolved_by_user_id").references(() => user.id, { onDelete: "set null" }),
    resolvedByName: text("resolved_by_name"),
  },
  (table) => [
    unique("content_report_reporter_target_unique").on(table.reporterId, table.targetType, table.targetId),
    index("content_report_created_at_idx").on(desc(table.createdAt)),
    index("content_report_target_idx").on(table.targetType, table.targetId),
    index("content_report_reported_member_id_idx").on(table.reportedMemberId),
    check(
      "content_report_target_known",
      sql`${table.targetType} in ('${sql.raw(REPORT_TARGETS.post)}', '${sql.raw(REPORT_TARGETS.comment)}', '${sql.raw(REPORT_TARGETS.introNote)}', '${sql.raw(REPORT_TARGETS.ask)}', '${sql.raw(REPORT_TARGETS.askAnswer)}')`,
    ),
    check("content_report_body_length", sql`char_length(${table.body}) between 1 and ${sql.raw(String(FEED_LIMITS.postLength))}`),
  ],
);

// Admin › Announcements: one row per send. The send key makes a second click find the first send.
export const announcement = pgTable(
  "announcement",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sendKey: uuid("send_key").notNull().unique(),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    audience: text("audience").notNull(),
    cohort: text("cohort"),
    queuedCount: integer("queued_count").notNull(),
    postId: uuid("post_id").references(() => post.id, { onDelete: "set null" }),
    sentByUserId: text("sent_by_user_id").references(() => user.id, { onDelete: "set null" }),
    sentByName: text("sent_by_name").notNull(),
    sentAt: adminTimestamp("sent_at").notNull().defaultNow(),
  },
  (table) => [
    index("announcement_sent_at_idx").on(desc(table.sentAt)),
    check("announcement_audience_known", sql`${table.audience} in (${sql.raw(Object.values(ANNOUNCEMENT_AUDIENCES).map((audience) => `'${audience}'`).join(", "))})`),
  ],
);
