import "server-only";

import { and, eq, or } from "drizzle-orm";

import { isActiveMember } from "../../platform/auth/member-status.ts";
import { user } from "../../platform/database/auth-schema.ts";
import type { DatabaseOrTransaction } from "../../platform/database/client.ts";
import { REQUEST_ERROR_CODES } from "../../platform/http/error-codes.ts";
import type { RequestContext } from "../../platform/http/request-context.ts";
import { RequestError } from "../../platform/http/request-error.ts";
import { BOOKING_VISIBILITIES, parseBookingUrl, type BookingBody, type BookingVisibility } from "./contract-community-roles.ts";
import { callRequest, memberBlock, memberProfile } from "./schema.ts";
import { isListedMember } from "./service-privacy.ts";

const NOT_FOUND_STATUS = 404;

// "Only people whose intro I accepted" needs the intros, which sit above members: the shell passes the check in
// (`shell/booking-access.ts`). -> whether the two were introduced.
export type IntroducedCheck = (connection: DatabaseOrTransaction, viewerId: string, ownerId: string) => Promise<boolean>;

export type OwnBooking = { bookingUrl: string | null; bookingVisibility: BookingVisibility };

export async function readOwnBooking(database: DatabaseOrTransaction, memberId: string): Promise<OwnBooking> {
  const [row] = await database
    .select({ bookingUrl: memberProfile.bookingUrl, bookingVisibility: memberProfile.bookingVisibility })
    .from(memberProfile)
    .where(eq(memberProfile.userId, memberId));
  return {
    bookingUrl: row?.bookingUrl ?? null,
    bookingVisibility: row?.bookingVisibility === BOOKING_VISIBILITIES.introduced ? BOOKING_VISIBILITIES.introduced : BOOKING_VISIBILITIES.community,
  };
}

// Saved without touching "fresh as of": a booking link isn't the member's own words.
export async function saveBooking({ database, member }: RequestContext, { bookingUrl, bookingVisibility }: BookingBody) {
  await database
    .insert(memberProfile)
    .values({ userId: member.id, bookingUrl, bookingVisibility })
    .onConflictDoUpdate({ target: memberProfile.userId, set: { bookingUrl, bookingVisibility } });
}

async function isBlockedEitherWay(connection: DatabaseOrTransaction, firstId: string, secondId: string) {
  const [row] = await connection
    .select({ blockerId: memberBlock.blockerId })
    .from(memberBlock)
    .where(
      or(
        and(eq(memberBlock.blockerId, firstId), eq(memberBlock.blockedId, secondId)),
        and(eq(memberBlock.blockerId, secondId), eq(memberBlock.blockedId, firstId)),
      ),
    )
    .limit(1);
  return row !== undefined;
}

type StoredBooking = { ownerId: string; bookingUrl: string | null; bookingVisibility: string };

// The one rule for every screen and answer: a link shows to another member only while its owner is an active, listed
// member, neither blocked the other, and the link is for the whole community or the viewer was introduced to them.
async function mayViewerSee(connection: DatabaseOrTransaction, viewerId: string, booking: StoredBooking, wereIntroduced: IntroducedCheck) {
  if (!booking.bookingUrl || !parseBookingUrl(booking.bookingUrl) || booking.ownerId === viewerId) return false;
  if (await isBlockedEitherWay(connection, viewerId, booking.ownerId)) return false;
  if (booking.bookingVisibility === BOOKING_VISIBILITIES.community) return true;
  return wereIntroduced(connection, viewerId, booking.ownerId);
}

async function readListedBooking(connection: DatabaseOrTransaction, ownerId: string): Promise<StoredBooking | null> {
  const [row] = await connection
    .select({ ownerId: user.id, bookingUrl: memberProfile.bookingUrl, bookingVisibility: memberProfile.bookingVisibility })
    .from(user)
    .innerJoin(memberProfile, eq(memberProfile.userId, user.id))
    .where(and(eq(user.id, ownerId), isActiveMember(), isListedMember()));
  return row ?? null;
}

// The booking link one member may see on another's profile. -> the link, or null.
export async function readShownBooking(connection: DatabaseOrTransaction, viewerId: string, ownerId: string, wereIntroduced: IntroducedCheck) {
  const booking = await readListedBooking(connection, ownerId);
  if (!booking || !(await mayViewerSee(connection, viewerId, booking, wereIntroduced))) return null;
  return booking.bookingUrl;
}

// For a list (the directory): the rows' stored links, cut to the ones the viewer may see. Every row is already an
// active, listed member.
export async function readShownBookings(connection: DatabaseOrTransaction, viewerId: string, bookings: readonly StoredBooking[], wereIntroduced: IntroducedCheck) {
  const shown = new Map<string, string>();
  for (const booking of bookings) {
    if (booking.bookingUrl && (await mayViewerSee(connection, viewerId, booking, wereIntroduced))) shown.set(booking.ownerId, booking.bookingUrl);
  }
  return shown;
}

// "Book a call": one row per click, only for a link the member may see. -> the link to open.
export async function recordCallRequest({ database, member }: RequestContext, memberId: string, wereIntroduced: IntroducedCheck) {
  return database.transaction(async (transaction) => {
    const bookingUrl = await readShownBooking(transaction, member.id, memberId, wereIntroduced);
    if (!bookingUrl) throw new RequestError(NOT_FOUND_STATUS, REQUEST_ERROR_CODES.memberNotFound, "This booking link isn't available. Reload the page.");
    await transaction.insert(callRequest).values({ requesterId: member.id, memberId });
    return bookingUrl;
  });
}
