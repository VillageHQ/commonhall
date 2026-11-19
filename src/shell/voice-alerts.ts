import "server-only";

import { voiceManifest } from "@/modules/voice/manifest";
import { claimDueReminders } from "@/modules/voice/service";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isModuleEnabled } from "@/platform/modules/enablement";

// Voice rooms' alerts: "Maya is available to talk — join" to every member, and "Your room is starting" to those who
// tapped "Remind me". They go through notify() (part notifications), which skips members in quiet hours and those
// who muted the sender. That part hasn't merged yet, so these only report what they would send.
// TODO(voice-sessions): wire notify() with kinds `voice_broadcast` and `voice_room` once notifications merges.

export type AvailableAlert = { roomId: string; hostId: string; hostName: string; title: string };
export type RoomReminder = { roomId: string; title: string; memberIds: string[] };

export async function sendAvailableAlert(_database: Database, _environment: Environment, _alert: AvailableAlert) {
  return { sent: 0 };
}

export async function sendRoomReminders(_database: Database, _environment: Environment, _reminders: RoomReminder[]) {
  return { sent: 0 };
}

// The minute job: rooms whose time has come send their reminders once. Runs only while Rooms is on.
export async function runVoiceReminders(database: Database, environment: Environment) {
  if (!(await isModuleEnabled(database, voiceManifest))) return { sent: 0 };
  const due = await claimDueReminders(database);
  return sendRoomReminders(database, environment, due.map(({ id, title, memberIds }) => ({ roomId: id, title, memberIds })));
}
