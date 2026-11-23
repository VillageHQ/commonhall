import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "../../platform/database/auth-schema.ts";

const MILLISECOND_PRECISION = 3;

function voiceTimestamp(name: string) {
  return timestamp(name, { withTimezone: true, precision: MILLISECOND_PRECISION });
}

// One row per room. Nothing said in a room is stored: no audio, no chat, no reactions. Rooms are never recorded.
export const voiceRoom = pgTable(
  "voice_room",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    // Who runs the room now. A co-host takes over when the host leaves.
    hostId: text("host_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    access: text("access").notNull(),
    status: text("status").notNull(),
    // Opened by the retired "I'm available to talk" (before round 6). New rooms never set it.
    isBroadcast: boolean("is_broadcast").notNull().default(false),
    // A scheduled room's "Notify others", sent when the room starts: the audience, and for "People I pick" their ids.
    notifyAudience: text("notify_audience"),
    notifyMemberIds: jsonb("notify_member_ids").$type<string[]>(),
    scheduledFor: voiceTimestamp("scheduled_for"),
    startedAt: voiceTimestamp("started_at"),
    endedAt: voiceTimestamp("ended_at"),
    // Set when the room's last person on stage was seen gone; the room ends 2 minutes later.
    emptyStageSince: voiceTimestamp("empty_stage_since"),
    // Set when the room was first seen with nobody connected at all; the room ends a minute later.
    emptySince: voiceTimestamp("empty_since"),
    remindersSentAt: voiceTimestamp("reminders_sent_at"),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("voice_room_access_known", sql`${table.access} in ('open', 'invite')`),
    check("voice_room_status_known", sql`${table.status} in ('scheduled', 'live', 'ended')`),
    check("voice_room_notify_audience_known", sql`${table.notifyAudience} is null or ${table.notifyAudience} in ('followers', 'picked', 'everyone')`),
    index("voice_room_status_idx").on(table.status),
  ],
);

// Everyone with a place in a room: their role, a raised hand, and for an invite-only room, the invite list.
export const voiceRoomMember = pgTable(
  "voice_room_member",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => voiceRoom.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    isInvited: boolean("is_invited").notNull().default(false),
    handRaisedAt: voiceTimestamp("hand_raised_at"),
    joinedAt: voiceTimestamp("joined_at"),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.memberId] }),
    check("voice_room_member_role_known", sql`${table.role} in ('host', 'cohost', 'speaker', 'listener')`),
  ],
);

// "Remind me" on a scheduled room.
export const voiceRoomReminder = pgTable(
  "voice_room_reminder",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => voiceRoom.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.memberId] })],
);

// Each "Notify others" a member sent (starting a room, or "Tell people I'm here"), for the limit of 3 a day. Rows from
// before round 6 are the retired "I'm available to talk" (audience null). `reached` is how many alerts went out.
export const voiceBroadcast = pgTable(
  "voice_broadcast",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => voiceRoom.id, { onDelete: "cascade" }),
    audience: text("audience"),
    reached: integer("reached").notNull().default(0),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("voice_broadcast_member_idx").on(table.memberId, table.createdAt),
    check("voice_broadcast_audience_known", sql`${table.audience} is null or ${table.audience} in ('followers', 'picked', 'everyone')`),
  ],
);

// "Tell me when Lina starts a room": a one-way follow, chosen by the follower (who gets the alerts).
export const voiceFollow = pgTable(
  "voice_follow",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followedId: text("followed_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.followerId, table.followedId] }), index("voice_follow_followed_idx").on(table.followedId)],
);

// One row per member a room notify reached: at most one alert per room, and at most 5 a day from others' notifies.
// Rows go after 7 days.
export const voiceNotifyReceipt = pgTable(
  "voice_notify_receipt",
  {
    roomId: uuid("room_id")
      .notNull()
      .references(() => voiceRoom.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roomId, table.memberId] }), index("voice_notify_receipt_member_idx").on(table.memberId, table.createdAt)],
);

// The member's last "Notify others" choice, so the sheet opens on it. No row: off (the first time).
export const voiceNotifyChoice = pgTable(
  "voice_notify_choice",
  {
    memberId: text("member_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    audience: text("audience").notNull(),
    updatedAt: voiceTimestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [check("voice_notify_choice_audience_known", sql`${table.audience} in ('off', 'followers', 'picked', 'everyone')`)],
);
