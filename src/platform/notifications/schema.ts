import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "../database/auth-schema.ts";
import { ALL_DAYS } from "./contract.ts";

// A place alerts go: a browser's Web Push subscription or the store app's Expo push token. `address` is the
// browser's endpoint or the token, unique, so registering again moves it to whoever signed in on that device.
export const notificationDevice = pgTable(
  "notification_device",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    address: text("address").notNull().unique(),
    // Web Push only: the browser's keys that encrypt each alert.
    p256dh: text("p256dh"),
    auth: text("auth"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  },
  (table) => [index("notification_device_user_idx").on(table.userId), check("notification_device_type", sql`${table.type} in ('webpush', 'expo')`)],
);

// A member's choices. No row means alerts on, every kind, no quiet times, no pause, Let through off. The `quiet_*` columns held the
// single quiet window before several quiet times (notification_quiet_time); nothing reads them now, and a later
// release drops them, so a revert loses nothing.
export const notificationPreference = pgTable("notification_preference", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  isOn: boolean("is_on").notNull().default(true),
  // Kinds turned off; a kind added later starts on.
  offKinds: text("off_kinds").array().notNull().default(sql`'{}'::text[]`),
  quietIsOn: boolean("quiet_is_on").notNull().default(false),
  quietFrom: text("quiet_from").notNull().default("22:00"),
  quietTo: text("quiet_to").notNull().default("07:00"),
  quietDays: integer("quiet_days")
    .array()
    .notNull()
    .default(sql.raw(`'{${ALL_DAYS.join(",")}}'::integer[]`)),
  timeZone: text("time_zone").notNull().default("UTC"),
  // A pause holds back every alert until then.
  pausedUntil: timestamp("paused_until", { withTimezone: true }),
  // During quiet times, alerts sent straight to the member still come. Off for members who joined after round 7
  // (quiet means quiet); members from before it kept theirs on (migration 0048 wrote it down).
  letDirectThrough: boolean("let_direct_through").notNull().default(false),
  // False only on the rows migration 0048 wrote for members who never saved: their choices are kept, but their time
  // zone is still the browser's until they save or pause (readPreferenceSaved).
  isSavedByMember: boolean("is_saved_by_member").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// A time the portfolio stays quiet for a member (at most 3, contract.ts): from–to on its days, or all day on them, in
// the member's time zone (notification_preference.time_zone).
export const notificationQuietTime = pgTable(
  "notification_quiet_time",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    from: text("from").notNull(),
    to: text("to").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    days: integer("days").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notification_quiet_time_user_idx").on(table.userId)],
);

// "Don't alert me when this person broadcasts." Other kinds from them still come.
export const notificationMute = pgTable(
  "notification_mute",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mutedUserId: text("muted_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.mutedUserId] })],
);

// For checking only: one row per member and alert notify() handled, sent or skipped and why. Written only in demo
// mode and development (log.ts), kept 7 days, listed at /me/alerts/log.
export const notificationLog = pgTable(
  "notification_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    // The app path the alert opens.
    url: text("url").notNull(),
    status: text("status").notNull(),
    // Why it was skipped (rules.ts SKIP_REASONS); null when sent.
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notification_log_user_idx").on(table.userId, table.createdAt), check("notification_log_status", sql`${table.status} in ('sent', 'skipped')`)],
);
