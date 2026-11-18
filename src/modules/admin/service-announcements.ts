import "server-only";

import { eq } from "drizzle-orm";

import { FEED_LIMITS } from "../feed/contract.ts";
import { feedManifest } from "../feed/manifest.ts";
import { createAnnouncementPostWithin } from "../feed/service.ts";
import { AUDIT_ACTIONS } from "../../platform/audit/actions.ts";
import { withAdminTransaction } from "../../platform/audit/admin-transaction.ts";
import { recordAdminAction } from "../../platform/audit/record.ts";
import { readBranding } from "../../platform/branding/branding.ts";
import { user } from "../../platform/database/auth-schema.ts";
import type { DatabaseOrTransaction } from "../../platform/database/client.ts";
import { clipLine, renderPlainTextHtml } from "../../platform/email/email-text.ts";
import { EMAIL_KINDS } from "../../platform/email/kinds.ts";
import { queueEmail } from "../../platform/email/outbox.ts";
import { sendQueuedEmailNow } from "../../platform/email/outbox-sender.ts";
import { readResendConfig } from "../../platform/email/resend.ts";
import { UNSUBSCRIBE_URL_MARK } from "../../platform/email/unsubscribe.ts";
import { resolveAppUrl } from "../../platform/http/app-url.ts";
import type { RequestContext } from "../../platform/http/request-context.ts";
import { RequestError } from "../../platform/http/request-error.ts";
import { ROUTES } from "../../platform/http/routes.ts";
import { isModuleEnabled } from "../../platform/modules/enablement.ts";
import { recordFailedAttempt } from "../../platform/rate-limit/attempt-rate-limit.ts";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_ERROR_CODES,
  describeAnnouncementAudience,
  isInAudience,
  type AnnouncementAudience,
  type AnnouncementSendBody,
  type AnnouncementSent,
  type AnnouncementTestBody,
} from "./contract-announcements.ts";
import { readAnnouncementMembers, type AnnouncementRecipient } from "./reads-announcements.ts";
import { renderAnnouncementPost, renderAnnouncementText, type AnnouncementFieldValues } from "./rules-announcement-fields.ts";
import { announcement } from "./schema.ts";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const TOO_MANY_REQUESTS_STATUS = 429;
const TESTS_PER_MINUTE = 5;
const AUDIT_SUBJECT_LENGTH = 60;

type Message = { subject: string; body: string };

// The email one member gets: their fields filled in, the stop line (the outbox puts their own unsubscribe link where
// the mark is), and the sign-off every member email ends with.
export function renderAnnouncementEmail(message: Message, values: AnnouncementFieldValues, stopUrl: string = UNSUBSCRIBE_URL_MARK) {
  const { subject, text } = renderAnnouncementText(message, values, stopUrl);
  return { subject, text, html: renderPlainTextHtml(text) };
}

function readFieldValues(member: Pick<AnnouncementRecipient, "name" | "company">, community: string): AnnouncementFieldValues {
  return { fullName: member.name, company: member.company, community };
}

function emailOffError() {
  return new RequestError(CONFLICT_STATUS, ANNOUNCEMENT_ERROR_CODES.emailOff, "Email is off on this site, so nothing was sent. Set up email first (Set up › Mail).");
}

async function readEarlierSend(connection: DatabaseOrTransaction, sendKey: string): Promise<AnnouncementSent | null> {
  const [earlier] = await connection
    .select({ id: announcement.id, queued: announcement.queuedCount, postId: announcement.postId })
    .from(announcement)
    .where(eq(announcement.sendKey, sendKey));
  return earlier ? { id: earlier.id, queued: earlier.queued, isPosted: earlier.postId !== null, isRepeat: true } : null;
}

// The fields make the feed post longer than the message typed ({community} becomes the community's name).
function tooLongForFeedError(overBy: number) {
  return new RequestError(
    UNPROCESSABLE_STATUS,
    ANNOUNCEMENT_ERROR_CODES.tooLong,
    `With the fields filled in, this is too long for the feed post by ${overBy.toLocaleString("en-US")} characters. Shorten the message, then send it.`,
  );
}

function emptyAudienceError(audience: AnnouncementAudience, memberCount: number) {
  const who = describeAnnouncementAudience(audience);
  const message =
    memberCount === 0
      ? `Nobody is in ${who} yet, so there is no one to send this to. Pick another audience.`
      : `Everyone in ${who} turned announcement emails off, so there is no one to send this to.`;
  return new RequestError(UNPROCESSABLE_STATUS, ANNOUNCEMENT_ERROR_CODES.emptyAudience, message);
}

// One email per member in the audience, the announcement's row, the team's pinned post (for everyone, while the
// feed is on) and the audit entry, all in one transaction. The send key makes a repeated click a no-op.
export async function sendAnnouncement({ database, environment, member }: RequestContext, body: AnnouncementSendBody): Promise<AnnouncementSent> {
  if (!readResendConfig(environment)) throw emailOffError();
  const earlier = await readEarlierSend(database, body.sendKey);
  if (earlier) return earlier;

  const { sendKey, subject, body: message, ...audience } = body;
  const [branding, isFeedOn] = await Promise.all([readBranding(database), isModuleEnabled(database, feedManifest)]);
  const community = branding.name;

  return withAdminTransaction(database, member.id, async (transaction) => {
    const [admin] = await transaction.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, member.id));
    const [created] = await transaction
      .insert(announcement)
      .values({
        sendKey,
        subject,
        body: message,
        audience: audience.audience,
        cohort: audience.audience === ANNOUNCEMENT_AUDIENCES.cohort ? audience.cohort : null,
        queuedCount: 0,
        sentByUserId: member.id,
        sentByName: admin?.name || admin?.email || "An admin",
      })
      .onConflictDoNothing({ target: announcement.sendKey })
      .returning({ id: announcement.id });
    if (!created) {
      const repeat = await readEarlierSend(transaction, sendKey);
      if (repeat) return repeat;
      throw new RequestError(CONFLICT_STATUS, ANNOUNCEMENT_ERROR_CODES.tooFast, "This announcement is already being sent.");
    }

    const members = (await readAnnouncementMembers(transaction)).filter((recipient) => isInAudience(recipient, audience));
    const wanted = members.filter(({ isWanted }) => isWanted);
    if (wanted.length === 0) throw emptyAudienceError(audience, members.length);

    let queued = 0;
    for (const recipient of wanted) {
      const email = renderAnnouncementEmail({ subject, body: message }, readFieldValues(recipient, community));
      const id = await queueEmail(transaction, environment, {
        kind: EMAIL_KINDS.announcement,
        to: recipient.email,
        memberId: recipient.id,
        ...email,
        dedupeKey: `announcement:${created.id}:${recipient.id}`,
      });
      if (id) queued += 1;
    }

    const shouldPost = isFeedOn && audience.audience === ANNOUNCEMENT_AUDIENCES.everyone;
    const postBody = renderAnnouncementPost({ subject, body: message }, community);
    if (shouldPost && postBody.length > FEED_LIMITS.postLength) throw tooLongForFeedError(postBody.length - FEED_LIMITS.postLength);
    const posted = shouldPost ? await createAnnouncementPostWithin(transaction, member.id, postBody) : null;
    await transaction.update(announcement).set({ queuedCount: queued, postId: posted?.postId ?? null }).where(eq(announcement.id, created.id));
    const emails = queued === 1 ? "1 email" : `${queued} emails`;
    await recordAdminAction(transaction, member.id, {
      action: AUDIT_ACTIONS.announcementSent,
      detail: `“${clipLine(subject, AUDIT_SUBJECT_LENGTH)}” to ${describeAnnouncementAudience(audience)}: ${emails}${posted ? ", pinned in the feed" : ""}`,
    });
    return { id: created.id, queued, isPosted: posted !== null, isRepeat: false };
  });
}

// "Send a test to me": the email as the chosen member would get it, to the admin's own address, sent at once.
export async function sendAnnouncementTest({ database, environment, member }: RequestContext, { subject, body, memberId }: AnnouncementTestBody) {
  if (!readResendConfig(environment)) throw emailOffError();
  if ((await recordFailedAttempt(database, `announcement-test:${member.id}`, TESTS_PER_MINUTE)).isLimited) {
    throw new RequestError(TOO_MANY_REQUESTS_STATUS, ANNOUNCEMENT_ERROR_CODES.tooFast, "You sent a few tests just now. Wait a minute before the next one.");
  }
  const [members, branding, [admin]] = await Promise.all([
    readAnnouncementMembers(database),
    readBranding(database),
    database.select({ email: user.email }).from(user).where(eq(user.id, member.id)),
  ]);
  const shownAs = members.find(({ id }) => id === memberId);
  if (!shownAs || !admin) {
    throw new RequestError(NOT_FOUND_STATUS, ANNOUNCEMENT_ERROR_CODES.memberGone, "That member isn't in the community any more. Pick another one for the preview.");
  }

  const stopUrl = `${resolveAppUrl(environment)}${ROUTES.emailSettings}`;
  const email = renderAnnouncementEmail({ subject, body }, readFieldValues(shownAs, branding.name), stopUrl);
  const queuedId = await queueEmail(database, environment, { kind: EMAIL_KINDS.emailTest, to: admin.email, memberId: member.id, ...email, subject: `[Test] ${email.subject}` });
  await sendQueuedEmailNow(database, environment, queuedId);
  return { to: admin.email };
}
