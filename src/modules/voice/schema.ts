import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
    // Opened by "I'm available to talk".
    isBroadcast: boolean("is_broadcast").notNull().default(false),
    scheduledFor: voiceTimestamp("scheduled_for"),
    startedAt: voiceTimestamp("started_at"),
    endedAt: voiceTimestamp("ended_at"),
    // Set when the room's last person on stage was seen gone; the room ends 2 minutes later.
    emptyStageSince: voiceTimestamp("empty_stage_since"),
    remindersSentAt: voiceTimestamp("reminders_sent_at"),
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    check("voice_room_access_known", sql`${table.access} in ('open', 'invite')`),
    check("voice_room_status_known", sql`${table.status} in ('scheduled', 'live', 'ended')`),
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

// Each "I'm available to talk", for the limit of 3 a day.
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
    createdAt: voiceTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("voice_broadcast_member_idx").on(table.memberId, table.createdAt)],
);
