import "server-only";

import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, sql, type SQL } from "drizzle-orm";

import { isAdminMember } from "@/platform/auth/roles";
import { user } from "@/platform/database/auth-schema";
import type { Database, DatabaseOrTransaction, Transaction } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import type { RequestContext } from "@/platform/http/request-context";
import { RequestError } from "@/platform/http/request-error";
import { isDemoMode } from "@/platform/demo/mode";
import { readSettings } from "@/platform/settings/store";
import { INSTANCE_SETTING_KEYS } from "@/platform/settings/schema";
import { shownFaceColumns, toShownFaceUrl } from "@/modules/members/reads-pictures";

import { closeLiveRoom, createRoomToken, pushParticipantFacts, readConnectedIdentities, removeFromRoom, type VoiceConfig } from "./client";
import {
  isModerator,
  isOnStage,
  ROLE_ACTIONS,
  ROOM_ACCESS,
  ROOM_ROLES,
  ROOM_STATUSES,
  STAGE_ROLES,
  toAutoRoomTitle,
  VOICE_ERROR_CODES,
  VOICE_LIMITS,
  VOICE_MESSAGES,
  type CreateRoomInput,
  type HandBody,
  type RemindBody,
  type RenameBody,
  type RoleBody,
  type RoomJoin,
  type RoomRole,
} from "./contract";
import { readVoiceConfig, requireVoiceConfig } from "./service-settings";
import { voiceBroadcast, voiceNotifyReceipt, voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

// Who a start alerts. Every room made now alerts everyone. Rooms made before round 7 keep their host's choice: a
// scheduled room saved for its host's followers or people picked alerts them, and an invite-only room only its
// invited. Server-only: no screen offers a choice any more.
export const NOTIFY_AUDIENCES = { followers: "followers", picked: "picked", everyone: "everyone" } as const;
export type NotifyAudience = (typeof NOTIFY_AUDIENCES)[keyof typeof NOTIFY_AUDIENCES];

const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const DAY_MS = 24 * 60 * 60_000;
// A scheduled room nobody started is closed a day after its time.
const STALE_SCHEDULE_MS = DAY_MS;
// The host has this long to connect after starting a room before the job counts them gone.
const CONNECT_GRACE_MS = 30_000;

function notFound() {
  return new RequestError(NOT_FOUND_STATUS, VOICE_ERROR_CODES.notFound, VOICE_MESSAGES.notFound);
}

function notModerator() {
  return new RequestError(FORBIDDEN_STATUS, VOICE_ERROR_CODES.notModerator, VOICE_MESSAGES.notModerator);
}

function notHost() {
  return new RequestError(FORBIDDEN_STATUS, VOICE_ERROR_CODES.notModerator, VOICE_MESSAGES.notHost);
}

function ended() {
  return new RequestError(CONFLICT_STATUS, VOICE_ERROR_CODES.ended, VOICE_MESSAGES.ended);
}

export function toLiveKitRoomName(roomId: string) {
  return `room-${roomId}`;
}

type Seat = { role: RoomRole; isInvited: boolean; handRaisedAt: Date | null };

// The room's row, locked so two moderators' changes take turns.
async function lockRoom(transaction: Transaction, roomId: string) {
  const [room] = await transaction.select().from(voiceRoom).where(eq(voiceRoom.id, roomId)).for("update");
  if (!room) throw notFound();
  return room;
}

async function readSeat(connection: DatabaseOrTransaction, roomId: string, memberId: string): Promise<Seat | null> {
  const [seat] = await connection
    .select({ role: voiceRoomMember.role, isInvited: voiceRoomMember.isInvited, handRaisedAt: voiceRoomMember.handRaisedAt })
    .from(voiceRoomMember)
    .where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, memberId)));
  return seat ? { ...seat, role: seat.role as RoomRole } : null;
}

async function readFace(connection: DatabaseOrTransaction, memberId: string) {
  const [row] = await connection
    .select({ name: user.name, ...shownFaceColumns(user.id) })
    .from(user)
    .where(eq(user.id, memberId));
  if (!row) throw notFound();
  return { name: row.name, faceUrl: toShownFaceUrl(memberId, row.avatarUpdatedAt, row.filledFace) };
}

// Tells everyone in the room what changed about one member. After the change is committed.
async function pushSeat(database: Database, environment: Environment, roomId: string, memberId: string) {
  const config = await readVoiceConfig(database, environment);
  if (!config) return;
  const [seat, face] = await Promise.all([readSeat(database, roomId, memberId), readFace(database, memberId).catch(() => null)]);
  if (!seat) return;
  await pushParticipantFacts(config, toLiveKitRoomName(roomId), memberId, { role: seat.role, isHandRaised: seat.handRaisedAt !== null, faceUrl: face?.faceUrl ?? null });
}

function readSchedule(scheduledFor: string | null, now: Date) {
  if (scheduledFor === null) return null;
  const at = new Date(scheduledFor);
  if (at.getTime() <= now.getTime() || at.getTime() > now.getTime() + VOICE_LIMITS.scheduleAheadDays * DAY_MS) {
    throw new RequestError(UNPROCESSABLE_STATUS, VOICE_ERROR_CODES.badSchedule, VOICE_MESSAGES.badSchedule);
  }
  return at;
}

type RoomValues = { title: string; scheduledAt: Date | null };

async function insertRoom(transaction: Transaction, hostId: string, values: RoomValues, now: Date) {
  const isLive = values.scheduledAt === null;
  const [room] = await transaction
    .insert(voiceRoom)
    .values({
      title: values.title,
      hostId,
      createdById: hostId,
      // Every new room is open to every member; invite-only rooms made before round 7 keep their rule.
      access: ROOM_ACCESS.open,
      status: isLive ? ROOM_STATUSES.live : ROOM_STATUSES.scheduled,
      scheduledFor: values.scheduledAt,
      // A scheduled room alerts everyone when it starts. Saved as "everyone" so Start now tells it apart from a room
      // scheduled before round 7 with nobody to alert (null), until those columns go.
      notifyAudience: isLive ? null : NOTIFY_AUDIENCES.everyone,
      startedAt: isLive ? now : null,
    })
    .returning({ id: voiceRoom.id });
  if (!room) throw notFound();
  await transaction.insert(voiceRoomMember).values({ roomId: room.id, memberId: hostId, role: ROOM_ROLES.host, isInvited: true });
  return room.id;
}

// A second tap within a few seconds finds the room the first one made, instead of opening another.
const REPEAT_WINDOW_MS = 10_000;

async function lockMember(transaction: Transaction, memberId: string) {
  const [me] = await transaction.select({ name: user.name }).from(user).where(eq(user.id, memberId)).for("no key update");
  if (!me) throw notFound();
  return me;
}

async function findRecentRoom(transaction: Transaction, memberId: string, where: SQL | undefined, now: Date) {
  const [room] = await transaction
    .select({ id: voiceRoom.id })
    .from(voiceRoom)
    .where(and(eq(voiceRoom.createdById, memberId), gte(voiceRoom.createdAt, new Date(now.getTime() - REPEAT_WINDOW_MS)), ne(voiceRoom.status, ROOM_STATUSES.ended), where))
    .limit(1);
  return room?.id ?? null;
}

async function findHostedLiveRoom(transaction: Transaction, memberId: string) {
  const [room] = await transaction
    .select({ id: voiceRoom.id })
    .from(voiceRoom)
    .where(and(eq(voiceRoom.hostId, memberId), eq(voiceRoom.status, ROOM_STATUSES.live), eq(voiceRoom.isBroadcast, false)))
    .orderBy(desc(voiceRoom.startedAt))
    .limit(1);
  return room?.id ?? null;
}

// A start that alerts people, ready to send once its transaction commits.
export type ClaimedNotify = { broadcastId: string; roomId: string; senderId: string; audience: NotifyAudience; memberIds: string[] };

export async function countBroadcastsToday(connection: DatabaseOrTransaction, memberId: string, now = new Date()) {
  const [row] = await connection
    .select({ total: count() })
    .from(voiceBroadcast)
    .where(and(eq(voiceBroadcast.memberId, memberId), gte(voiceBroadcast.createdAt, new Date(now.getTime() - DAY_MS))));
  return row?.total ?? 0;
}

// Counts one alerting start against the host's 3 a day, or answers null past them: that room starts quietly. The
// caller holds the host's row lock, so two starts at once take turns.
async function claimNotify(transaction: Transaction, roomId: string, senderId: string, audience: NotifyAudience, memberIds: string[], now: Date): Promise<ClaimedNotify | null> {
  if ((await countBroadcastsToday(transaction, senderId, now)) >= VOICE_LIMITS.broadcastsPerDay) return null;
  const [row] = await transaction.insert(voiceBroadcast).values({ memberId: senderId, roomId, audience, createdAt: now }).returning({ id: voiceBroadcast.id });
  if (!row) throw notFound();
  return { broadcastId: row.id, roomId, senderId, audience, memberIds };
}

export type CreatedRoom = { roomId: string; notify: ClaimedNotify | null; isQuiet: boolean };

// Whether the host's start of this room alerted people (one `voice_broadcast` row).
export async function hasAlerted(connection: DatabaseOrTransaction, roomId: string, hostId: string) {
  const [row] = await connection.select({ id: voiceBroadcast.id }).from(voiceBroadcast).where(and(eq(voiceBroadcast.roomId, roomId), eq(voiceBroadcast.memberId, hostId))).limit(1);
  return row !== undefined;
}

// Start a room now (one tap: an empty title becomes "<first name>'s room") or schedule one (a title is needed, as
// nobody is in it yet). Starting now alerts everyone, within the host's 3 alerting starts a day; past them the room
// starts quietly. The caller sends the alert after commit.
export async function createRoom({ database, member }: RequestContext, body: CreateRoomInput, now = new Date()): Promise<CreatedRoom> {
  const scheduledAt = readSchedule(body.scheduledFor ?? null, now);
  const typed = body.title?.trim() ?? "";
  if (scheduledAt && !typed) throw new RequestError(UNPROCESSABLE_STATUS, VOICE_ERROR_CODES.needsTitle, VOICE_MESSAGES.needsTitle);
  return database.transaction(async (transaction) => {
    const me = await lockMember(transaction, member.id);
    const title = typed || toAutoRoomTitle(me.name);
    // A host runs one live room at a time: starting again while theirs is live reopens it (no second "Sam's room"),
    // and a second tap within 10 seconds finds the room just made.
    const live = scheduledAt ? null : await findHostedLiveRoom(transaction, member.id);
    const repeat = live ?? (await findRecentRoom(transaction, member.id, and(eq(voiceRoom.title, title), eq(voiceRoom.isBroadcast, false)), now));
    // A second tap answers as the first did: a live room that alerted nobody is still quiet.
    if (repeat) return { roomId: repeat, notify: null, isQuiet: !scheduledAt && !(await hasAlerted(transaction, repeat, member.id)) };
    const roomId = await insertRoom(transaction, member.id, { title, scheduledAt }, now);
    if (scheduledAt) return { roomId, notify: null, isQuiet: false };
    const notify = await claimNotify(transaction, roomId, member.id, NOTIFY_AUDIENCES.everyone, [], now);
    return { roomId, notify, isQuiet: notify === null };
  });
}

export async function recordReached(database: Database, broadcastId: string, reached: number) {
  await database.update(voiceBroadcast).set({ reached }).where(eq(voiceBroadcast.id, broadcastId));
}

// The host renames their room, live or coming up (a one-tap room starts as "Sam's room").
export async function renameRoom({ database, member }: RequestContext, { roomId, title }: RenameBody) {
  await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.hostId !== member.id) throw notHost();
    if (room.status === ROOM_STATUSES.ended) throw ended();
    await transaction.update(voiceRoom).set({ title }).where(eq(voiceRoom.id, roomId));
  });
}

// Starting a scheduled room (early or on time) claims its reminders, so "Remind me" fires when it really starts and
// the minute job never sends them again. It alerts the room's saved audience: everyone for rooms made since round 7,
// and the host's own choice for older ones (none when they chose nobody). Past the host's 3 alerting starts a day the
// room starts quietly.
export async function startScheduledRoom({ database, member }: RequestContext, roomId: string, now = new Date()) {
  return database.transaction(async (transaction) => {
    await lockMember(transaction, member.id);
    const room = await lockRoom(transaction, roomId);
    if (room.hostId !== member.id) throw notHost();
    if (room.status === ROOM_STATUSES.ended) throw ended();
    if (room.status === ROOM_STATUSES.live) return { reminder: null, notify: null, isQuiet: false };
    await transaction
      .update(voiceRoom)
      .set({ status: ROOM_STATUSES.live, startedAt: now, remindersSentAt: room.remindersSentAt ?? now, notifyAudience: null, notifyMemberIds: null })
      .where(eq(voiceRoom.id, roomId));
    const audience = room.notifyAudience as NotifyAudience | null;
    const notify = audience ? await claimNotify(transaction, roomId, member.id, audience, room.notifyMemberIds ?? [], now) : null;
    const isQuiet = audience !== null && notify === null;
    if (room.remindersSentAt) return { reminder: null, notify, isQuiet };
    const reminders = await transaction.select({ memberId: voiceRoomReminder.memberId }).from(voiceRoomReminder).where(eq(voiceRoomReminder.roomId, roomId));
    return { reminder: { id: room.id, title: room.title, hostId: room.hostId, memberIds: reminders.map(({ memberId }) => memberId) }, notify, isQuiet };
  });
}

// Lets a signed-in member into a live room with a short-lived token for their role. An invite-only room lets in only
// the people on its list.
export async function joinRoom({ database, environment, member }: RequestContext, roomId: string, now = new Date()): Promise<RoomJoin> {
  const config = await requireVoiceConfig(database, environment);
  const role = await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.status === ROOM_STATUSES.ended) throw ended();
    if (room.status !== ROOM_STATUSES.live) throw new RequestError(CONFLICT_STATUS, VOICE_ERROR_CODES.notLive, VOICE_MESSAGES.notLive);
    const seat = await readSeat(transaction, roomId, member.id);
    if (room.access === ROOM_ACCESS.invite && !seat?.isInvited) {
      throw new RequestError(FORBIDDEN_STATUS, VOICE_ERROR_CODES.notInvited, VOICE_MESSAGES.notInvited);
    }
    const seatRole = seat?.role ?? ROOM_ROLES.listener;
    await transaction
      .insert(voiceRoomMember)
      .values({ roomId, memberId: member.id, role: seatRole, joinedAt: now })
      .onConflictDoUpdate({ target: [voiceRoomMember.roomId, voiceRoomMember.memberId], set: { joinedAt: now } });
    if (room.emptySince || (isOnStage(seatRole) && room.emptyStageSince)) {
      await transaction
        .update(voiceRoom)
        .set({ emptySince: null, ...(isOnStage(seatRole) ? { emptyStageSince: null } : {}) })
        .where(eq(voiceRoom.id, roomId));
    }
    return seatRole;
  });
  const [face, seat] = await Promise.all([readFace(database, member.id), readSeat(database, roomId, member.id)]);
  const roomName = toLiveKitRoomName(roomId);
  const token = await createRoomToken(config, roomName, member.id, face.name, { role, isHandRaised: Boolean(seat?.handRaisedAt), faceUrl: face.faceUrl });
  return { serverUrl: config.serverUrl, token, roomName, role, identity: member.id };
}

async function requireLiveSeat(transaction: Transaction, roomId: string, memberId: string) {
  const room = await lockRoom(transaction, roomId);
  if (room.status !== ROOM_STATUSES.live) throw ended();
  const seat = await readSeat(transaction, roomId, memberId);
  if (!seat) throw notFound();
  return { room, seat };
}

export async function setHand(context: RequestContext, { roomId, isRaised }: HandBody, now = new Date()) {
  const { database, environment, member } = context;
  await database.transaction(async (transaction) => {
    const { seat } = await requireLiveSeat(transaction, roomId, member.id);
    // Only listeners raise a hand; someone on stage already may speak.
    if (isRaised && isOnStage(seat.role)) return;
    await transaction
      .update(voiceRoomMember)
      .set({ handRaisedAt: isRaised ? now : null })
      .where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, member.id)));
  });
  await pushSeat(database, environment, roomId, member.id);
}

// The role after a moderator's action, or null when the action doesn't apply. Only the host changes co-hosts, and
// nobody changes the host. Anyone on stage may step down themselves.
export function readNextRole(actorRole: RoomRole, isSelf: boolean, targetRole: RoomRole, action: RoleBody["action"]): RoomRole | null {
  if (targetRole === ROOM_ROLES.host) return null;
  if (isSelf) return action === ROLE_ACTIONS.moveDown && isOnStage(targetRole) ? ROOM_ROLES.listener : null;
  if (!isModerator(actorRole)) return null;
  const touchesCohost = targetRole === ROOM_ROLES.cohost || action === ROLE_ACTIONS.makeCohost || action === ROLE_ACTIONS.removeCohost;
  if (touchesCohost && actorRole !== ROOM_ROLES.host) return null;
  switch (action) {
    case ROLE_ACTIONS.inviteUp:
      return targetRole === ROOM_ROLES.listener ? ROOM_ROLES.speaker : null;
    case ROLE_ACTIONS.moveDown:
      return isOnStage(targetRole) ? ROOM_ROLES.listener : null;
    case ROLE_ACTIONS.makeCohost:
      return targetRole === ROOM_ROLES.cohost ? null : ROOM_ROLES.cohost;
    case ROLE_ACTIONS.removeCohost:
      return targetRole === ROOM_ROLES.cohost ? ROOM_ROLES.speaker : null;
  }
}

export async function changeRole(context: RequestContext, { roomId, memberId, action }: RoleBody) {
  const { database, environment, member } = context;
  await database.transaction(async (transaction) => {
    const { seat: actor } = await requireLiveSeat(transaction, roomId, member.id);
    const target = memberId === member.id ? actor : await readSeat(transaction, roomId, memberId);
    if (!target) throw new RequestError(UNPROCESSABLE_STATUS, VOICE_ERROR_CODES.badTarget, VOICE_MESSAGES.badTarget);
    const nextRole = readNextRole(actor.role, memberId === member.id, target.role, action);
    if (nextRole === null) throw actor.role === ROOM_ROLES.cohost ? notHost() : notModerator();
    await transaction
      .update(voiceRoomMember)
      .set({ role: nextRole, handRaisedAt: null })
      .where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, memberId)));
  });
  await pushSeat(database, environment, roomId, memberId);
}

// The co-host who takes over: the first made co-host among those still connected (or, without LiveKit's list, any).
async function pickSuccessor(transaction: Transaction, roomId: string, connected: string[] | null) {
  const cohosts = await transaction
    .select({ memberId: voiceRoomMember.memberId })
    .from(voiceRoomMember)
    .where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.role, ROOM_ROLES.cohost)))
    .orderBy(asc(voiceRoomMember.createdAt));
  return cohosts.find(({ memberId }) => connected === null || connected.includes(memberId))?.memberId ?? null;
}

async function handOver(transaction: Transaction, roomId: string, oldHostId: string, newHostId: string) {
  await transaction.update(voiceRoom).set({ hostId: newHostId }).where(eq(voiceRoom.id, roomId));
  await transaction.update(voiceRoomMember).set({ role: ROOM_ROLES.host, handRaisedAt: null }).where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, newHostId)));
  await transaction.update(voiceRoomMember).set({ role: ROOM_ROLES.listener }).where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, oldHostId)));
}

// Leaving quietly. A speaker steps off the stage; a host hands the room to a co-host when one is there, else the room
// waits (the host may come back): it ends a minute after nobody is connected, or 2 minutes after nobody is on stage.
// The web room and the store app ask to leave before they disconnect, so LiveKit lets the member go here first: the
// room's check below, and every card read after it, no longer count them.
export async function leaveRoom(context: RequestContext, roomId: string, now = new Date()) {
  const { database, environment, member } = context;
  const config = await readVoiceConfig(database, environment);
  if (config) await removeFromRoom(config, toLiveKitRoomName(roomId), member.id);
  const connected = config ? await readConnectedIdentities(config, toLiveKitRoomName(roomId)) : null;
  const changed = await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.status !== ROOM_STATUSES.live) return [];
    const seat = await readSeat(transaction, roomId, member.id);
    if (!seat) return [];
    const where = and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, member.id));
    if (seat.role === ROOM_ROLES.host) {
      const others = connected?.filter((id) => id !== member.id) ?? null;
      const successor = await pickSuccessor(transaction, roomId, others);
      if (successor) {
        await handOver(transaction, roomId, member.id, successor);
        return [successor, member.id];
      }
      return [];
    }
    await transaction.update(voiceRoomMember).set({ role: seat.role === ROOM_ROLES.speaker ? ROOM_ROLES.listener : seat.role, handRaisedAt: null }).where(where);
    return [member.id];
  });
  for (const memberId of changed) await pushSeat(database, environment, roomId, memberId);
  await checkRoom(database, environment, roomId, now);
}

async function closeRoom(database: Database, config: VoiceConfig | null, roomId: string, now: Date) {
  await database.update(voiceRoom).set({ status: ROOM_STATUSES.ended, endedAt: now }).where(and(eq(voiceRoom.id, roomId), sql`${voiceRoom.status} <> ${ROOM_STATUSES.ended}`));
  if (config) await closeLiveRoom(config, toLiveKitRoomName(roomId));
}

// The host ends the room for everyone; an admin may too.
export async function endRoom(context: RequestContext, roomId: string, now = new Date()) {
  const { database, environment, member } = context;
  const [room] = await database.select({ hostId: voiceRoom.hostId, status: voiceRoom.status }).from(voiceRoom).where(eq(voiceRoom.id, roomId));
  if (!room) throw notFound();
  if (room.hostId !== member.id && !isAdminMember(member)) throw notHost();
  await closeRoom(database, await readVoiceConfig(database, environment), roomId, now);
}

// Only for a room the member may see: an invite-only room's reminder would carry its title to someone off the list.
export async function setReminder({ database, member }: RequestContext, { roomId, isOn }: RemindBody) {
  const [room] = await database.select({ status: voiceRoom.status, access: voiceRoom.access }).from(voiceRoom).where(eq(voiceRoom.id, roomId));
  if (!room || room.status !== ROOM_STATUSES.scheduled) throw notFound();
  if (room.access === ROOM_ACCESS.invite && !(await readSeat(database, roomId, member.id))?.isInvited) throw notFound();
  if (isOn) await database.insert(voiceRoomReminder).values({ roomId, memberId: member.id }).onConflictDoNothing();
  else await database.delete(voiceRoomReminder).where(and(eq(voiceRoomReminder.roomId, roomId), eq(voiceRoomReminder.memberId, member.id)));
}

// One live room's upkeep: a co-host takes over from a host who is gone; a room with nobody connected for a minute ends,
// and so does one with nobody on stage for 2 minutes. Skipped while LiveKit can't be reached, so an outage never ends
// a room.
export async function checkRoom(database: Database, environment: Environment, roomId: string, now = new Date()) {
  const config = await readVoiceConfig(database, environment);
  if (!config) return;
  const connected = await readConnectedIdentities(config, toLiveKitRoomName(roomId));
  if (connected === null) return;
  const seededAt = await readDemoSeededAt(database, environment);
  const outcome = await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.status !== ROOM_STATUSES.live || (seededAt && room.createdAt <= seededAt)) return { changed: [] as string[], isEnding: false };
    const startedLongAgo = room.startedAt !== null && now.getTime() - room.startedAt.getTime() >= CONNECT_GRACE_MS;
    const changed: string[] = [];
    if (startedLongAgo && !connected.includes(room.hostId)) {
      const successor = await pickSuccessor(transaction, roomId, connected);
      if (successor) {
        await handOver(transaction, roomId, room.hostId, successor);
        changed.push(successor, room.hostId);
      }
    }
    const stage = await transaction
      .select({ memberId: voiceRoomMember.memberId })
      .from(voiceRoomMember)
      .where(and(eq(voiceRoomMember.roomId, roomId), inArray(voiceRoomMember.role, [...STAGE_ROLES])));
    // Nobody connected needs no grace: a host still connecting has just been given a token, and joining clears it.
    const emptySince = connected.length === 0 ? (room.emptySince ?? now) : null;
    const isStageEmpty = startedLongAgo && !stage.some(({ memberId }) => connected.includes(memberId));
    const emptyStageSince = isStageEmpty ? (room.emptyStageSince ?? now) : null;
    if (emptySince !== room.emptySince || emptyStageSince !== room.emptyStageSince) {
      await transaction.update(voiceRoom).set({ emptySince, emptyStageSince }).where(eq(voiceRoom.id, roomId));
    }
    const isEnding =
      (emptySince !== null && now.getTime() - emptySince.getTime() >= VOICE_LIMITS.emptyRoomMs) ||
      (emptyStageSince !== null && now.getTime() - emptyStageSince.getTime() >= VOICE_LIMITS.emptyStageMs);
    return { changed, isEnding };
  });
  for (const memberId of outcome.changed) await pushSeat(database, environment, roomId, memberId);
  if (outcome.isEnding) await closeRoom(database, config, roomId, now);
}

// Rooms due a reminder: scheduled, their time come, reminders not yet sent. Marked sent here; the caller alerts.
export async function claimDueReminders(database: Database, now = new Date()) {
  const due = await database
    .update(voiceRoom)
    .set({ remindersSentAt: now })
    .where(and(eq(voiceRoom.status, ROOM_STATUSES.scheduled), lte(voiceRoom.scheduledFor, now), isNull(voiceRoom.remindersSentAt)))
    .returning({ id: voiceRoom.id, title: voiceRoom.title, hostId: voiceRoom.hostId });
  if (due.length === 0) return [];
  const reminders = await database
    .select({ roomId: voiceRoomReminder.roomId, memberId: voiceRoomReminder.memberId })
    .from(voiceRoomReminder)
    .where(inArray(voiceRoomReminder.roomId, due.map(({ id }) => id)));
  return due.map((room) => ({ ...room, memberIds: reminders.filter(({ roomId }) => roomId === room.id).map(({ memberId }) => memberId) }));
}

// In demo mode, the rooms the demo seed made stay as they are until the nightly reset: nobody real is in them, so the
// upkeep would end them within minutes. Rooms that visitors make follow the usual rules. Null outside demo mode.
export async function readDemoSeededAt(database: Database, environment: Environment) {
  if (!isDemoMode(environment)) return null;
  const seededAt = (await readSettings(database, [INSTANCE_SETTING_KEYS.demoSeededAt])).get(INSTANCE_SETTING_KEYS.demoSeededAt);
  return seededAt ? new Date(seededAt) : null;
}

// The minute job: every live room's upkeep, scheduled rooms nobody started closed a day after their time, and notify
// receipts older than 7 days dropped.
export async function tickVoiceRooms(database: Database, environment: Environment, now = new Date()) {
  const seededAt = await readDemoSeededAt(database, environment);
  const isNotSeeded = seededAt ? gt(voiceRoom.createdAt, seededAt) : undefined;
  await database
    .update(voiceRoom)
    .set({ status: ROOM_STATUSES.ended, endedAt: now })
    .where(and(eq(voiceRoom.status, ROOM_STATUSES.scheduled), isNotNull(voiceRoom.scheduledFor), lte(voiceRoom.scheduledFor, new Date(now.getTime() - STALE_SCHEDULE_MS)), isNotSeeded));
  const live = await database.select({ id: voiceRoom.id }).from(voiceRoom).where(and(eq(voiceRoom.status, ROOM_STATUSES.live), isNotSeeded));
  // checkRoom also leaves the demo's seeded rooms alone (someone leaving one runs it too).
  for (const { id } of live) await checkRoom(database, environment, id, now);
  await database.delete(voiceNotifyReceipt).where(lt(voiceNotifyReceipt.createdAt, new Date(now.getTime() - VOICE_LIMITS.receiptDays * DAY_MS)));
}

// A removed member's rooms: the ones they host end; their seats go with the cascade when the account is erased.
export async function endRoomsHostedBy(transaction: Transaction, memberId: string, now = new Date()) {
  await transaction
    .update(voiceRoom)
    .set({ status: ROOM_STATUSES.ended, endedAt: now })
    .where(and(eq(voiceRoom.hostId, memberId), sql`${voiceRoom.status} <> ${ROOM_STATUSES.ended}`));
}
