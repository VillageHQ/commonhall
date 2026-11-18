import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { user } from "@/platform/database/auth-schema";
import { AUDIT_ACTIONS } from "@/platform/audit/actions";
import { adminAuditEntry } from "@/platform/audit/schema";
import { callRequest, memberProfile } from "@/modules/members/schema";
import { introRequest } from "@/modules/intros/schema";
import { readCalls } from "@/modules/admin/reads-calls";
import { readCommunityRole } from "@/modules/members/contract-community-roles";
import { parseInvitesCsv } from "@/modules/members/contract-bulk-invites";
import { directorySchema } from "@/modules/members/contract-profile";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { createSignedInMember } from "@/test/signed-in-member";
import { nameMember } from "@/test/intros";

import { POST as postBooking } from "@/app/api/profile/booking/route";
import { POST as postCall } from "@/app/api/members/call/route";
import { POST as postDirectory } from "@/app/api/members/directory/route";
import { POST as postCommunityRole } from "@/app/api/admin/members/community-role/route";
import { POST as postRemove } from "@/app/api/admin/members/remove/route";
import { POST as postDelete } from "@/app/api/profile/delete/route";

const APP_URL = "http://localhost:3000";
const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const LINK = "https://cal.example.com/grace";

type Member = Awaited<ReturnType<typeof createSignedInMember>>;
type Handler = (request: Request) => Promise<Response>;

function call(handler: Handler, member: Member, body: unknown) {
  return handler(
    new Request(`${APP_URL}/api/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP_URL, Cookie: member.cookie },
      body: JSON.stringify(body),
    }),
  );
}

// The spec's verification contract: who sees a booking link, and one call request per "Book a call".
describe("mentors and Book a call", () => {
  const database = createTestDatabase();
  let admin: Member;
  let mentor: Member;
  let founder: Member;
  let stranger: Member;

  async function readDirectory(viewer: Member, filters: Record<string, unknown> = { isExpertsView: true }) {
    const response = await call(postDirectory, viewer, filters);
    return directorySchema.parse(await response.json());
  }

  async function introduce(requester: Member, introducer: Member) {
    const now = new Date();
    await database.insert(introRequest).values({
      requesterId: requester.userId,
      introducerId: introducer.userId,
      targetLinkedinSlug: "made-up-target",
      targetName: "Made Up",
      introducerName: "Grace Kim",
      reason: "A made-up reason",
      note: "A made-up note",
      state: "accepted",
      acceptedAt: now,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  beforeEach(async () => {
    await clearDatabase(database);
    admin = await createSignedInMember(database, "admin");
    mentor = await createSignedInMember(database);
    founder = await createSignedInMember(database);
    stranger = await createSignedInMember(database);
    await nameMember(database, mentor.userId, "Grace Kim");
    await nameMember(database, founder.userId, "Sam Lee");
    await nameMember(database, stranger.userId, "Kwame Asante");
  });

  it("lets only an admin set a community role, and writes it to the audit log", async () => {
    expect((await call(postCommunityRole, founder, { memberId: mentor.userId, communityRole: "mentor" })).status).toBe(FORBIDDEN_STATUS);
    expect((await call(postCommunityRole, admin, { memberId: mentor.userId, communityRole: "mentor" })).status).toBe(OK_STATUS);

    const [profile] = await database.select({ role: memberProfile.communityRole }).from(memberProfile).where(eq(memberProfile.userId, mentor.userId));
    expect(profile?.role).toBe("mentor");
    const entries = await database.select().from(adminAuditEntry).where(eq(adminAuditEntry.action, AUDIT_ACTIONS.communityRoleChanged));
    expect(entries).toMatchObject([{ targetMemberId: mentor.userId, detail: "Mentor" }]);
  });

  it("refuses anything but an https link", async () => {
    for (const bookingUrl of ["http://cal.example.com/grace", "javascript:alert(1)", "cal.example.com/grace", "mailto:grace@example.com"]) {
      const response = await call(postBooking, mentor, { bookingUrl, bookingVisibility: "community" });
      expect(response.status).toBe(UNPROCESSABLE_STATUS);
      expect(JSON.stringify(await response.json())).toContain("https://");
    }
    expect((await call(postBooking, mentor, { bookingUrl: LINK, bookingVisibility: "community" })).status).toBe(OK_STATUS);
  });

  it("lists only mentors, experts, advisors and entrepreneurs in residence, by role, without hidden members", async () => {
    await call(postCommunityRole, admin, { memberId: mentor.userId, communityRole: "mentor" });
    await call(postCommunityRole, admin, { memberId: stranger.userId, communityRole: "fund_team" });
    await call(postBooking, mentor, { bookingUrl: LINK, bookingVisibility: "community" });

    const experts = await readDirectory(founder);
    expect(experts.members.map(({ name }) => name)).toEqual(["Grace Kim"]);
    expect(experts.members[0]).toMatchObject({ communityRole: "mentor", bookingUrl: LINK });
    expect((await readDirectory(founder, { isExpertsView: true, communityRole: "advisor" })).members).toEqual([]);

    await database.update(memberProfile).set({ communityRole: "advisor" }).where(eq(memberProfile.userId, mentor.userId));
    expect((await readDirectory(founder, { isExpertsView: true, communityRole: "advisor" })).members.map(({ name }) => name)).toEqual(["Grace Kim"]);
  });

  it("never shows or sends an introduced-only link to a member who wasn't introduced", async () => {
    await call(postCommunityRole, admin, { memberId: mentor.userId, communityRole: "mentor" });
    await call(postBooking, mentor, { bookingUrl: LINK, bookingVisibility: "introduced" });
    await introduce(founder, mentor);

    const strangerView = await readDirectory(stranger);
    expect(strangerView.members[0]?.bookingUrl).toBeNull();
    expect(JSON.stringify(strangerView)).not.toContain(LINK);
    const refused = await call(postCall, stranger, { memberId: mentor.userId });
    expect(refused.status).toBe(NOT_FOUND_STATUS);
    expect(JSON.stringify(await refused.json())).not.toContain(LINK);

    expect((await readDirectory(founder)).members[0]?.bookingUrl).toBe(LINK);
    expect(await database.select().from(callRequest)).toHaveLength(0);
  });

  it("records exactly one call request per click, never on your own link, and the admin counts match the rows", async () => {
    await call(postBooking, mentor, { bookingUrl: LINK, bookingVisibility: "community" });

    const first = await call(postCall, founder, { memberId: mentor.userId });
    expect(first.status).toBe(OK_STATUS);
    expect(await first.json()).toEqual({ bookingUrl: LINK });
    await call(postCall, founder, { memberId: mentor.userId });
    expect((await call(postCall, mentor, { memberId: mentor.userId })).status).toBe(NOT_FOUND_STATUS);

    const rows = await database.select().from(callRequest);
    expect(rows).toHaveLength(2);
    const calls = await readCalls(database);
    expect(calls.total).toBe(rows.length);
    expect(calls.perPerson).toEqual([{ memberId: mentor.userId, name: "Grace Kim", role: "founder", calls: 2 }]);
    expect(calls.perWeek.reduce((sum, week) => sum + week.calls, 0)).toBe(2);
    expect(calls.rows.map(({ requesterName, memberName }) => [requesterName, memberName])).toEqual([
      ["Sam Lee", "Grace Kim"],
      ["Sam Lee", "Grace Kim"],
    ]);
  });

  it("drops a removed member's link from every view, and keeps a deleted member's past calls counted without their name", async () => {
    await call(postCommunityRole, admin, { memberId: mentor.userId, communityRole: "mentor" });
    await call(postBooking, mentor, { bookingUrl: LINK, bookingVisibility: "community" });
    await call(postCall, founder, { memberId: mentor.userId });

    expect((await call(postRemove, admin, { memberId: mentor.userId, contentChoice: "keep" })).status).toBe(OK_STATUS);
    expect((await readDirectory(founder)).members).toEqual([]);
    expect((await call(postCall, founder, { memberId: mentor.userId })).status).toBe(NOT_FOUND_STATUS);

    expect((await call(postDelete, founder, { confirmation: "delete" })).status).toBe(OK_STATUS);
    const calls = await readCalls(database);
    expect(calls.total).toBe(1);
    expect(calls.rows[0]?.requesterName).toBe("Deleted member");
    const [deleted] = await database.select({ name: user.name }).from(user).where(eq(user.id, founder.userId));
    expect(JSON.stringify(calls)).not.toContain("Sam Lee");
    expect(deleted?.name).toBe("Deleted member");
  });

  it("reads the CSV's optional community role column, and refuses a role it doesn't know", () => {
    const parsed = parseInvitesCsv("name,email,community role\nGrace Kim,grace@example.com,Mentor\nOli Grant,oli@example.com,EIR\nNo Body,nobody@example.com,Wizard\n");
    expect(parsed.people.map(({ email, communityRole }) => [email, communityRole])).toEqual([
      ["grace@example.com", "mentor"],
      ["oli@example.com", "entrepreneur_in_residence"],
    ]);
    expect(parsed.problems).toHaveLength(1);
    expect(readCommunityRole("Fund team")).toBe("fund_team");
  });
});
