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

// A member's choices. No row means alerts on, every kind, no quiet hours.
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
