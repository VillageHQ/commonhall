import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postSend } from "@/app/api/admin/announcements/send/route";
import { POST as postTest } from "@/app/api/admin/announcements/test/route";
import { POST as postFeed } from "@/app/api/feed/posts/route";
import { fillAnnouncementFields, readUnknownFields } from "@/modules/admin/rules-announcement-fields";
import { announcement } from "@/modules/admin/schema";
import { POST_TYPES } from "@/modules/feed/contract";
import { post } from "@/modules/feed/schema";
import { AUDIT_ACTIONS } from "@/platform/audit/actions";
import { adminAuditEntry } from "@/platform/audit/schema";
import { EMAIL_KINDS, EMAIL_TOPICS } from "@/platform/email/kinds";
import { sendDueEmails } from "@/platform/email/outbox-sender";
import { emailOutbox } from "@/platform/email/schema";
import { setEmailTopic } from "@/platform/email/unsubscribe";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { FAKE_RESEND_API_KEY, startFakeResendServer } from "@/test/fake-resend-server";
import { seedMember } from "@/test/members";
import { createSignedInMember } from "@/test/signed-in-member";

const APP_URL = "http://localhost:3000";
const AUTH_SECRET = "a-test-auth-secret-with-at-least-32-characters";
const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;
const UNPROCESSABLE_STATUS = 422;

type Member = Awaited<ReturnType<typeof createSignedInMember>>;
type Handler = (request: Request) => Promise<Response>;
type RecordedBody = { to: string[]; subject: string; text: string; headers?: Record<string, string> };

function call(handler: Handler, member: Member, body: unknown) {
  return handler(
    new Request(`${APP_URL}/api/admin/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP_URL, Cookie: member.cookie },
      body: JSON.stringify(body),
    }),
  );
}

const MESSAGE = { subject: "Demo day, {first name}", body: "Hi {first name} at {company},\n\n{community} holds demo day on 4 December. {nickname}" };

describe("fill-in fields", () => {
  const values = { fullName: "Amara Okafor", company: "Lumen Labs", community: "Northwind Founders" };

  it("fills each field per member, in any case and spacing", () => {
    expect(fillAnnouncementFields("Hi {first name} ({Full Name}) of {company} in {community}", values)).toBe("Hi Amara (Amara Okafor) of Lumen Labs in Northwind Founders");
    expect(fillAnnouncementFields("Hi { FIRST  name }", values)).toBe("Hi Amara");
  });

  it("never shows a raw field: a missing value takes a plain word, an unknown field is left out", () => {
    const empty = { fullName: "  ", company: null, community: "Northwind Founders" };
    expect(fillAnnouncementFields("Hi {first name}, how is {company}? {full name}{nickname}", empty)).toBe("Hi there, how is your company? there");
    expect(readUnknownFields("Hi {first name} {nickname} {Nickname}")).toEqual(["{nickname}", "{Nickname}"]);
  });
});

describe("announcements", () => {
  const database = createTestDatabase();
  let resend: Awaited<ReturnType<typeof startFakeResendServer>>;
  let admin: Member;
  let member: Member;
  let amara: string;
  let ben: string;
  let quiet: string;

  function readEnvironment() {
    return { APP_URL, BETTER_AUTH_SECRET: AUTH_SECRET, RESEND_API_KEY: FAKE_RESEND_API_KEY, RESEND_FROM_ADDRESS: "Northwind <hello@example.com>", RESEND_API_URL: resend.url };
  }

  async function readQueued() {
    return database.select().from(emailOutbox).where(eq(emailOutbox.kind, EMAIL_KINDS.announcement));
  }

  beforeAll(async () => {
    resend = await startFakeResendServer();
  });

  beforeEach(async () => {
    await clearDatabase(database);
    resend.reset();
    for (const [name, value] of Object.entries(readEnvironment())) vi.stubEnv(name, value);
    admin = await createSignedInMember(database, "admin");
    member = await createSignedInMember(database);
    amara = await seedMember(database, { name: "Amara Okafor", company: "Lumen Labs", cohort: "Spring 2026" });
    ben = await seedMember(database, { name: "Ben", cohort: "spring 2026 " });
    quiet = await seedMember(database, { name: "Quiet Quinn", cohort: "Fall 2025" });
    await seedMember(database, { name: "Banned Bo", banned: true });
    await setEmailTopic(database, { memberId: quiet, topic: EMAIL_TOPICS.announcements }, false);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await resend.stop();
    await database.$client.end();
  });

  it("emails every member who left announcements on, once, pins the team's post and writes the audit log", async () => {
    const body = { ...MESSAGE, audience: "everyone", sendKey: crypto.randomUUID() };
    const response = await call(postSend, admin, body);
    expect(response.status).toBe(OK_STATUS);
    // Admin, member, Amara, Ben: not the one who turned announcements off, not the banned member.
    expect(await response.json()).toMatchObject({ queued: 4, isPosted: true, isRepeat: false });

    const queued = await readQueued();
    expect(queued.map(({ memberId }) => memberId).sort()).toEqual([admin.userId, member.userId, amara, ben].sort());
    const toAmara = queued.find(({ memberId }) => memberId === amara);
    expect(toAmara?.subject).toBe("Demo day, Amara");
    expect(toAmara?.text).toContain("Hi Amara at Lumen Labs,");
    expect(queued.find(({ memberId }) => memberId === ben)?.text).toContain("Hi Ben at your company,");
    expect(queued.every(({ text }) => !/\{[^}]*\}/.test(text))).toBe(true);

    // A second click with the same form sends nothing new.
    const repeat = await call(postSend, admin, body);
    expect(await repeat.json()).toMatchObject({ queued: 4, isRepeat: true });
    expect(await readQueued()).toHaveLength(4);
    expect(await database.select().from(announcement)).toHaveLength(1);

    const [pinned] = await database.select().from(post);
    expect(pinned).toMatchObject({ type: POST_TYPES.announcement, authorId: admin.userId });
    expect(pinned?.pinnedAt).not.toBeNull();
    expect(pinned?.body).toMatch(/^Demo day, there\nHi there at your company,/);

    const [audit] = await database.select().from(adminAuditEntry).where(eq(adminAuditEntry.action, AUDIT_ACTIONS.announcementSent));
    expect(audit?.detail).toBe("“Demo day, {first name}” to everyone: 4 emails, pinned in the feed");

    // Sent through the outbox with a one-click unsubscribe for announcements.
    await sendDueEmails(database, readEnvironment());
    const sent = resend.state.emails.map(({ body: sentBody }) => sentBody as RecordedBody);
    expect(sent).toHaveLength(4);
    expect(sent.every(({ headers }) => headers?.["List-Unsubscribe-Post"] === "List-Unsubscribe=One-Click")).toBe(true);
    expect(sent.every(({ text }) => /Stop announcement emails: http:\/\/localhost:3000\/unsubscribe\?token=/.test(text))).toBe(true);
  });

  it("sends to one cohort by email only, matching its name whatever the case", async () => {
    const response = await call(postSend, admin, { ...MESSAGE, audience: "cohort", cohort: "SPRING 2026", sendKey: crypto.randomUUID() });
    expect(await response.json()).toMatchObject({ queued: 2, isPosted: false });
    expect((await readQueued()).map(({ memberId }) => memberId).sort()).toEqual([amara, ben].sort());
    expect(await database.select().from(post)).toHaveLength(0);
  });

  it("refuses an audience with nobody to send to, and says why", async () => {
    const empty = await call(postSend, admin, { ...MESSAGE, audience: "cohort", cohort: "Winter 2030", sendKey: crypto.randomUUID() });
    expect(empty.status).toBe(UNPROCESSABLE_STATUS);
    expect((await empty.json()).message).toContain("Nobody is in the Winter 2030 cohort");
    const allOff = await call(postSend, admin, { ...MESSAGE, audience: "cohort", cohort: "Fall 2025", sendKey: crypto.randomUUID() });
    expect(allOff.status).toBe(UNPROCESSABLE_STATUS);
    expect((await allOff.json()).message).toContain("turned announcement emails off");
    expect(await readQueued()).toHaveLength(0);
    expect(await database.select().from(announcement)).toHaveLength(0);
  });

  it("sends the test to the admin only, filled in as the chosen member", async () => {
    const response = await call(postTest, admin, { ...MESSAGE, memberId: amara });
    expect(await response.json()).toEqual({ to: admin.email });
    const [test] = resend.state.emails.map(({ body }) => body as RecordedBody);
    expect(test?.to).toEqual([admin.email]);
    expect(test?.subject).toBe("[Test] Demo day, Amara");
  });

  it("lets only admins send", async () => {
    expect((await call(postSend, member, { ...MESSAGE, audience: "everyone", sendKey: crypto.randomUUID() })).status).toBe(FORBIDDEN_STATUS);
    expect((await call(postTest, member, { ...MESSAGE, memberId: amara })).status).toBe(FORBIDDEN_STATUS);
    expect(await readQueued()).toHaveLength(0);
  });

  it("never lets a member post as the team", async () => {
    const response = await call(postFeed, member, { type: POST_TYPES.announcement, body: "Official news" });
    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });
});
