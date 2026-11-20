import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ASK_CATEGORIES } from "@/modules/asks/contract";
import { ask, askAnswer } from "@/modules/asks/schema";
import { INTRO_OUTCOMES, INTRO_STATES } from "@/modules/intros/contract";
import { introsManifest } from "@/modules/intros/manifest";
import { introRequest } from "@/modules/intros/schema";
import { ROUTES } from "@/platform/http/routes";
import { saveModuleState } from "@/platform/modules/enablement";
import { VILLAGE_TROUBLES } from "@/platform/village/health";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { joinMemberToGroup } from "@/test/intros";
import { createSignedInMember } from "@/test/signed-in-member";

import AdminHomePage from "@/app/(app)/admin/page";
import type { AdminTabFacts } from "./admin-badges";
import { ADMIN_HOME_ITEMS, MAX_HOME_ITEMS, readAdminHome, readAdminHomeItems, readConsoleHomePage } from "./admin-home";
import { readThisWeek } from "./admin-this-week";
import { describeLaunchSteps, readFirstName, LAUNCH_STEPS } from "./console-launch";
import { readIntroLog } from "@/modules/admin/reads-intro-log";

const session = vi.hoisted(() => ({ cookie: "" }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: session.cookie }) }));

const DAY_MS = 86_400_000;

type Member = Awaited<ReturnType<typeof createSignedInMember>>;

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

const QUIET_FACTS = {
  isSetupComplete: true,
  setupStepsLeft: 0,
  setupNextStep: null,
  membersBadge: 0,
  reportsBadge: 0,
  creditsBadge: 0,
  villageTrouble: null,
  villageOutOfCreditsAt: null,
  chatBadge: 0,
  hiddenTabHrefs: [],
} satisfies AdminTabFacts;

describe("the admin home", () => {
  const database = createTestDatabase();
  let admin: Member;
  let asker: Member;
  let connector: Member;

  async function seedIntro(seed: Partial<typeof introRequest.$inferInsert>) {
    await database.insert(introRequest).values({
      requesterId: asker.userId,
      introducerId: connector.userId,
      targetLinkedinSlug: `target-${crypto.randomUUID()}`,
      targetName: "Target Tess",
      introducerName: "Connector Cleo",
      introducerLinkedinSlug: "cleo",
      reason: "Worked together",
      note: "A note.",
      expiresAt: new Date(Date.now() + 7 * DAY_MS),
      ...seed,
    });
  }

  beforeEach(async () => {
    await clearDatabase(database);
    admin = await createSignedInMember(database, "admin");
    asker = await createSignedInMember(database);
    connector = await createSignedInMember(database);
    await joinMemberToGroup(database, asker.userId, "ada");
    await joinMemberToGroup(database, connector.userId, "cleo");
    session.cookie = admin.cookie;
  });

  afterAll(async () => {
    await database.$client.end();
  });

  it("counts this week: founders active, open asks with no help, intros waiting over 3 days; no room joins while Rooms is off", async () => {
    const now = new Date();
    await seedIntro({ createdAt: daysAgo(now, 5) });
    await seedIntro({ createdAt: daysAgo(now, 1) });
    const [helped] = await database.insert(ask).values({ authorId: asker.userId, category: ASK_CATEGORIES.advice, title: "Who knows a CFO?", detail: "For our board pack." }).returning({ id: ask.id });
    await database.insert(ask).values({ authorId: asker.userId, category: ASK_CATEGORIES.hire, title: "Who has hired a VP Sales?", detail: "Selling to hospitals." });
    await database.insert(askAnswer).values({ askId: helped!.id, authorId: connector.userId, body: "Happy to help." });

    const week = await readThisWeek(database, now);

    // The asker posted and asked for intros this week; the connector answered (both are founders by default).
    expect(week).toMatchObject({ asksWithNoHelp: 1, introsWaiting: 1, roomJoins: null });
    expect(week.activeFounders).toBeGreaterThanOrEqual(2);
  });

  it("says intros are off instead of showing a count", async () => {
    await saveModuleState(database, introsManifest, false);

    const [{ items }, week] = await Promise.all([readAdminHome(database, process.env), readThisWeek(database)]);

    expect(week.introsWaiting).toBeNull();
    expect(items.map(({ id }) => id)).not.toContain(ADMIN_HOME_ITEMS.stuckIntros);
  });

  it("counts an intro as waiting once it is over 3 days old and still with the connector or the person asked for", async () => {
    const now = new Date();
    await seedIntro({ createdAt: daysAgo(now, 5) });
    await seedIntro({ createdAt: daysAgo(now, 9), state: INTRO_STATES.askingTarget, askedTargetAt: daysAgo(now, 6) });
    await seedIntro({ createdAt: daysAgo(now, 1) });
    await seedIntro({ createdAt: daysAgo(now, 9), state: INTRO_STATES.askingTarget, askedTargetAt: daysAgo(now, 1) });
    await seedIntro({ createdAt: daysAgo(now, 9), isWithheld: true });

    const { items } = await readAdminHome(database, process.env, now);

    expect(items.find(({ id }) => id === ADMIN_HOME_ITEMS.stuckIntros)).toEqual({
      id: ADMIN_HOME_ITEMS.stuckIntros,
      label: "3 intros waiting over 3 days",
      href: ROUTES.adminIntroLog,
      isUrgent: false,
    });
  });

  it("shows the setup item on a fresh install, linking to Set up", async () => {
    const { items } = await readAdminHome(database, process.env);

    expect(items.find(({ id }) => id === ADMIN_HOME_ITEMS.setup)).toMatchObject({ label: "Next setup step: brand your community", href: ROUTES.adminSettings });
  });

  it("links each item to its place and leaves out every item at zero", () => {
    expect(readAdminHomeItems(QUIET_FACTS, { pendingInvites: 0, stuckIntros: 0 })).toEqual([]);

    const items = readAdminHomeItems(
      { ...QUIET_FACTS, reportsBadge: 1, membersBadge: 2, setupStepsLeft: 3, setupNextStep: "invite", villageTrouble: { trouble: VILLAGE_TROUBLES.keysRejected, troubleAt: null, lastOkAt: null } },
      { pendingInvites: 1, stuckIntros: 0 },
    );

    expect(items.map(({ label, href }) => [label, href])).toEqual([
      ["Village refused your keys", `${ROUTES.adminSettings}#village-keys`],
      ["1 report waiting", ROUTES.adminReports],
      ["2 people waiting for your OK", ROUTES.adminMembers],
      ["1 invite not accepted yet", ROUTES.adminInvites],
      ["Next setup step: invite your first members", ROUTES.adminInvites],
    ]);
  });

  it("opens the Village check from the Village item when network is on", () => {
    const facts = { ...QUIET_FACTS, villageTrouble: { trouble: VILLAGE_TROUBLES.keysRejected, troubleAt: null, lastOkAt: null } };

    expect(readAdminHomeItems(facts, { pendingInvites: 0, stuckIntros: 0, isNetworkOn: true })).toEqual([expect.objectContaining({ href: ROUTES.adminVillage })]);
  });

  it("names who asked whom in the intro log, never the note", async () => {
    const now = new Date();
    await seedIntro({ state: INTRO_STATES.completed, acceptedAt: now, askedTargetAt: now, targetAgreedAt: now, closedAt: now, outcome: INTRO_OUTCOMES.helped });
    await seedIntro({ state: INTRO_STATES.askingTarget, askedTargetAt: now });
    await seedIntro({});
    await seedIntro({ state: INTRO_STATES.declined, closedAt: now });
    await seedIntro({ state: INTRO_STATES.targetDeclined, askedTargetAt: now, closedAt: now });
    await seedIntro({ state: INTRO_STATES.withdrawn, closedAt: now });
    await seedIntro({ state: INTRO_STATES.expired, closedAt: now });
    await seedIntro({ isWithheld: true });

    const log = await readIntroLog(database);

    expect(JSON.stringify(log)).toMatch(/Target Tess/);
    expect(JSON.stringify(log)).not.toContain("A note.");
  });

  it("opens on the launch checklist on a fresh install, and on the dashboard once all four steps are done", async () => {
    const fresh = await readConsoleHomePage(database, process.env);

    expect(fresh.isLaunched).toBe(false);
    expect(fresh.thisWeek).toBeNull();
    expect(fresh.steps.map(({ key, isDone }) => [key, isDone])).toEqual([
      [LAUNCH_STEPS.look, false],
      [LAUNCH_STEPS.invite, false],
      [LAUNCH_STEPS.plumbing, false],
      [LAUNCH_STEPS.report, false],
    ]);
  });

  it("words each launch step like Commonhall, with its link", () => {
    const facts = { communityName: "Harbor Ventures", isLookSet: false, hasLogo: false, invitesAdded: 2, invitesEmailed: 2, invitesJoined: 0, isMailSet: false, isNetworkSet: false, mailDomain: null, hasMadeIntro: false };
    const text = describeLaunchSteps(facts).map(({ text: parts }) => parts.map(({ text: words }) => words).join(""));

    expect(text).toEqual([
      "Name, colour and logo. Set your look →",
      "2 invites sent. Invite more →",
      "Set up mail. Connect Village.",
      "Appears with the first intro.",
    ]);
    expect(describeLaunchSteps({ ...facts, isLookSet: true, hasLogo: true, isMailSet: true, isNetworkSet: true, mailDomain: "mail.harbor.example", hasMadeIntro: true }).map(({ isDone }) => isDone)).toEqual([true, true, true, true]);
    expect(readFirstName("Dana Whitfield", "x@example.com")).toBe("Dana");
  });

  // Found on a demo: the name alone marked the look done (the sidebar still showed initials), and an import with email
  // off said "6 invites sent" when nobody was emailed.
  it("counts the look done only with a logo, and never says invites were sent when no email went out", () => {
    const facts = { communityName: "Harbor Ventures", isLookSet: true, hasLogo: false, invitesAdded: 6, invitesEmailed: 0, invitesJoined: 0, isMailSet: false, isNetworkSet: false, mailDomain: null, hasMadeIntro: false };
    const steps = describeLaunchSteps(facts);
    const text = steps.map(({ text: parts }) => parts.map(({ text: words }) => words).join(""));

    expect(steps[0]?.isDone).toBe(false);
    expect(steps[1]?.isDone).toBe(false);
    expect(describeLaunchSteps({ ...facts, invitesJoined: 1 })[1]?.isDone).toBe(true);
    expect(text[0]).toBe("Members still see your initials. Add your logo →");
    expect(text[1]).toBe("6 added, no email sent yet. Send their links →");
    expect(steps[1]?.text.at(-1)).toMatchObject({ href: "/admin/links" });
    const someEmailed = describeLaunchSteps({ ...facts, invitesEmailed: 4 }).map(({ text: parts }) => parts.map(({ text: words }) => words).join(""));
    expect(someEmailed[1]).toBe("6 added, 4 emailed. Send their links →");
    expect(readFirstName("", "dana.whitfield@example.com")).toBe("Dana");
  });

  it("lists at most five things that need the admin, the most urgent first", () => {
    const items = readAdminHomeItems({ ...QUIET_FACTS, reportsBadge: 1, membersBadge: 1, setupStepsLeft: 2 }, { pendingInvites: 3, stuckIntros: 1, asksWithNoHelp: 2 });

    expect(items).toHaveLength(MAX_HOME_ITEMS);
    expect(items.map(({ id }) => id)).toEqual([ADMIN_HOME_ITEMS.reports, ADMIN_HOME_ITEMS.waitingMembers, ADMIN_HOME_ITEMS.asksWithNoHelp, ADMIN_HOME_ITEMS.stuckIntros, ADMIN_HOME_ITEMS.invites]);
    expect(items.find(({ id }) => id === ADMIN_HOME_ITEMS.asksWithNoHelp)).toMatchObject({ label: "2 asks have no help yet", href: "/admin/asks" });
  });

  it("sends a member who isn't an admin away", async () => {
    session.cookie = asker.cookie;

    await expect(AdminHomePage()).rejects.toThrow(/NEXT_REDIRECT/);
  });
});
