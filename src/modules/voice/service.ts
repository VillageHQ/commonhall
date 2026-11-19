import "server-only";

import { and, asc, count, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";

import { isAdminMember } from "@/platform/auth/roles";
import { isActiveMember } from "@/platform/auth/member-status";
import { user } from "@/platform/database/auth-schema";
import type { Database, DatabaseOrTransaction, Transaction } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import type { RequestContext } from "@/platform/http/request-context";
import { RequestError } from "@/platform/http/request-error";
import { shownFaceColumns, toShownFaceUrl } from "@/modules/members/reads-pictures";

import { closeLiveRoom, createRoomToken, pushParticipantFacts, readConnectedIdentities, type VoiceConfig } from "./client";
import {
  isModerator,
  isOnStage,
  ROLE_ACTIONS,
  ROOM_ACCESS,
  ROOM_ROLES,
  ROOM_STATUSES,
  STAGE_ROLES,
  VOICE_ERROR_CODES,
  VOICE_LIMITS,
  VOICE_MESSAGES,
  type CreateRoomBody,
  type HandBody,
  type InviteBody,
  type RemindBody,
  type RoleBody,
  type RoomJoin,
  type RoomRole,
} from "./contract";
import { readVoiceConfig, requireVoiceConfig } from "./service-settings";
import { voiceBroadcast, voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const TOO_MANY_STATUS = 429;
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

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
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

// Only active members can be invited.
async function readActiveIds(connection: DatabaseOrTransaction, memberIds: string[], now: Date) {
  if (memberIds.length === 0) return [];
  const rows = await connection.select({ id: user.id }).from(user).where(and(inArray(user.id, memberIds), isActiveMember(now)));
  return rows.map(({ id }) => id);
}

async function insertRoom(transaction: Transaction, hostId: string, values: { title: string; access: string; scheduledAt: Date | null; isBroadcast: boolean }, now: Date) {
  const isLive = values.scheduledAt === null;
  const [room] = await transaction
    .insert(voiceRoom)
    .values({
      title: values.title,
      hostId,
      createdById: hostId,
      access: values.access,
      status: isLive ? ROOM_STATUSES.live : ROOM_STATUSES.scheduled,
      isBroadcast: values.isBroadcast,
      scheduledFor: values.scheduledAt,
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
    .where(and(eq(voiceRoom.createdById, memberId), gte(voiceRoom.createdAt, new Date(now.getTime() - REPEAT_WINDOW_MS)), where))
    .limit(1);
  return room?.id ?? null;
}

export async function createRoom({ database, member }: RequestContext, body: CreateRoomBody, now = new Date()) {
  const scheduledAt = readSchedule(body.scheduledFor, now);
  return database.transaction(async (transaction) => {
    await lockMember(transaction, member.id);
    const repeat = await findRecentRoom(transaction, member.id, and(eq(voiceRoom.title, body.title), eq(voiceRoom.isBroadcast, false)), now);
    if (repeat) return { roomId: repeat };
    const roomId = await insertRoom(transaction, member.id, { title: body.title, access: body.access, scheduledAt, isBroadcast: false }, now);
    const invitees = (await readActiveIds(transaction, body.inviteeIds, now)).filter((id) => id !== member.id);
    if (invitees.length > 0) {
      await transaction
        .insert(voiceRoomMember)
        .values(invitees.map((memberId) => ({ roomId, memberId, role: ROOM_ROLES.listener, isInvited: true })))
        .onConflictDoNothing();
    }
    return { roomId };
  });
}

export async function countBroadcastsToday(connection: DatabaseOrTransaction, memberId: string, now = new Date()) {
  const [row] = await connection
    .select({ total: count() })
    .from(voiceBroadcast)
    .where(and(eq(voiceBroadcast.memberId, memberId), gte(voiceBroadcast.createdAt, new Date(now.getTime() - DAY_MS))));
  return row?.total ?? 0;
}

// "I'm available to talk": an open room with the member as host, counted against 3 a day (the last 24 hours). The
// member's row lock makes two taps at once count each other; while their last one is still live, a tap returns it
// (isNew false, so no second alert). The caller sends the alert after this commits.
export async function startAvailableRoom({ database, member }: RequestContext, now = new Date()) {
  return database.transaction(async (transaction) => {
    const me = await lockMember(transaction, member.id);
    const [open] = await transaction
      .select({ id: voiceRoom.id, title: voiceRoom.title })
      .from(voiceRoom)
      .where(and(eq(voiceRoom.hostId, member.id), eq(voiceRoom.isBroadcast, true), eq(voiceRoom.status, ROOM_STATUSES.live)))
      .limit(1);
    if (open) return { roomId: open.id, title: open.title, hostName: me.name, isNew: false };
    if ((await countBroadcastsToday(transaction, member.id, now)) >= VOICE_LIMITS.broadcastsPerDay) {
      throw new RequestError(TOO_MANY_STATUS, VOICE_ERROR_CODES.broadcastLimit, VOICE_MESSAGES.broadcastLimit);
    }
    const title = `${firstName(me.name)} is available to talk`;
    const roomId = await insertRoom(transaction, member.id, { title, access: ROOM_ACCESS.open, scheduledAt: null, isBroadcast: true }, now);
    await transaction.insert(voiceBroadcast).values({ memberId: member.id, roomId, createdAt: now });
    return { roomId, title, hostName: me.name, isNew: true };
  });
}

export async function startScheduledRoom({ database, member }: RequestContext, roomId: string, now = new Date()) {
  await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.hostId !== member.id) throw notHost();
    if (room.status === ROOM_STATUSES.ended) throw ended();
    if (room.status === ROOM_STATUSES.live) return;
    await transaction.update(voiceRoom).set({ status: ROOM_STATUSES.live, startedAt: now }).where(eq(voiceRoom.id, roomId));
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
    if (isOnStage(seatRole) && room.emptyStageSince) await transaction.update(voiceRoom).set({ emptyStageSince: null }).where(eq(voiceRoom.id, roomId));
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
// waits (the host may come back) and ends after 2 minutes with nobody on stage.
export async function leaveRoom(context: RequestContext, roomId: string, now = new Date()) {
  const { database, environment, member } = context;
  const config = await readVoiceConfig(database, environment);
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

export async function inviteMembers({ database, member }: RequestContext, { roomId, memberIds }: InviteBody, now = new Date()) {
  await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.status === ROOM_STATUSES.ended) throw ended();
    const seat = await readSeat(transaction, roomId, member.id);
    if (!seat || !isModerator(seat.role)) throw notModerator();
    const ids = await readActiveIds(transaction, memberIds, now);
    if (ids.length === 0) return;
    await transaction
      .insert(voiceRoomMember)
      .values(ids.map((memberId) => ({ roomId, memberId, role: ROOM_ROLES.listener, isInvited: true })))
      .onConflictDoUpdate({ target: [voiceRoomMember.roomId, voiceRoomMember.memberId], set: { isInvited: true } });
  });
}

// One live room's upkeep: a co-host takes over from a host who is gone, and a room with nobody on stage for 2 minutes
// ends. Skipped while LiveKit can't be reached, so an outage never ends a room.
export async function checkRoom(database: Database, environment: Environment, roomId: string, now = new Date()) {
  const config = await readVoiceConfig(database, environment);
  if (!config) return;
  const connected = await readConnectedIdentities(config, toLiveKitRoomName(roomId));
  if (connected === null) return;
  const outcome = await database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (room.status !== ROOM_STATUSES.live) return { changed: [] as string[], isEnding: false };
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
    const isStageEmpty = !stage.some(({ memberId }) => connected.includes(memberId));
    if (!isStageEmpty || !startedLongAgo) {
      if (room.emptyStageSince) await transaction.update(voiceRoom).set({ emptyStageSince: null }).where(eq(voiceRoom.id, roomId));
      return { changed, isEnding: false };
    }
    if (!room.emptyStageSince) {
      await transaction.update(voiceRoom).set({ emptyStageSince: now }).where(eq(voiceRoom.id, roomId));
      return { changed, isEnding: false };
    }
    return { changed, isEnding: now.getTime() - room.emptyStageSince.getTime() >= VOICE_LIMITS.emptyStageMs };
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

// The minute job: every live room's upkeep, and scheduled rooms nobody started closed a day after their time.
export async function tickVoiceRooms(database: Database, environment: Environment, now = new Date()) {
  await database
    .update(voiceRoom)
    .set({ status: ROOM_STATUSES.ended, endedAt: now })
    .where(and(eq(voiceRoom.status, ROOM_STATUSES.scheduled), isNotNull(voiceRoom.scheduledFor), lte(voiceRoom.scheduledFor, new Date(now.getTime() - STALE_SCHEDULE_MS))));
  const live = await database.select({ id: voiceRoom.id }).from(voiceRoom).where(eq(voiceRoom.status, ROOM_STATUSES.live));
  for (const { id } of live) await checkRoom(database, environment, id, now);
}

// A removed member's rooms: the ones they host end; their seats go with the cascade when the account is erased.
export async function endRoomsHostedBy(transaction: Transaction, memberId: string, now = new Date()) {
  await transaction
    .update(voiceRoom)
    .set({ status: ROOM_STATUSES.ended, endedAt: now })
    .where(and(eq(voiceRoom.hostId, memberId), sql`${voiceRoom.status} <> ${ROOM_STATUSES.ended}`));
}
