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
import { REPORT_TARGETS } from "@/modules/admin/contract";
import { contentReport } from "@/modules/admin/schema";
import { invite, memberProfile } from "@/modules/members/schema";
import { saveBranding } from "@/platform/branding/branding";
import { INSTANCE_SETTING_KEYS, instanceSettings } from "@/platform/settings/schema";
import { readNavigationBadges } from "./navigation-badges";
import { NAVIGATION_BADGES } from "./navigation-rules";

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
      // The log's Open intros, not all of them.
      href: `${ROUTES.adminIntroLog}?f=open`,
      isUrgent: false,
    });
  });

  it("shows the setup item on a fresh install, linking to Set up", async () => {
    const { items } = await readAdminHome(database, process.env);

    expect(items.find(({ id }) => id === ADMIN_HOME_ITEMS.setup)).toMatchObject({ label: "Next setup step: name your community", href: ROUTES.adminSettings });
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
      ["Next setup step: invite your first founders", ROUTES.adminInvites],
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

  it("opens on the one setup checklist on a fresh install, and on the dashboard once all four steps are done", async () => {
    const fresh = await readConsoleHomePage(database, process.env);

    expect(fresh.isLaunched).toBe(false);
    expect(fresh.thisWeek).toBeNull();
    expect(fresh.steps.map(({ key, isDone }) => [key, isDone])).toEqual([
      [LAUNCH_STEPS.name, false],
      [LAUNCH_STEPS.invite, false],
      [LAUNCH_STEPS.card, false],
      [LAUNCH_STEPS.mail, false],
    ]);
  });

  const NEW_FACTS = { communityName: "Harbor Ventures", isNameSet: true, isCardDone: false, invitesAdded: 0, invitesEmailed: 0, hasLiveInvite: false, isMailSet: false, mailDomain: null };

  function readWords(facts: typeof NEW_FACTS) {
    return describeLaunchSteps(facts).map(({ text: parts }) => parts.map(({ text: words }) => words).join(""));
  }

  it("words each step with its link, and has no Village or report step", () => {
    expect(readWords({ ...NEW_FACTS, isNameSet: false })).toEqual([
      "Founders see it on their invite. Name it →",
      "Paste their emails. Invite founders →",
      "Founders see it in People. Fill in your card →",
      "Copy each founder’s link from the invite, or set up mail →",
    ]);
    expect(describeLaunchSteps(NEW_FACTS)[2]?.text.at(-1)).toMatchObject({ href: "/admin/start?step=card" });
    expect(readFirstName("Dana Whitfield", "x@example.com")).toBe("Dana");
  });

  // Round 7: mail can't be set up from the app, so copying the links is a complete way to run; and with mail off an
  // invite is "made", never "sent".
  it("counts Mail done once links are made with mail off, so a finished setup has nothing left", () => {
    const copying = { ...NEW_FACTS, isCardDone: true, invitesAdded: 6, hasLiveInvite: true };
    const steps = describeLaunchSteps(copying);

    expect(steps.map(({ isDone }) => isDone)).toEqual([true, true, true, true]);
    expect(steps[3]?.title).toBe("Mail: you copy the links");
    expect(readWords(copying)[1]).toBe("6 invites made. Invite more →");
    expect(readWords({ ...copying, isMailSet: true, invitesEmailed: 4 })[1]).toBe("6 invites made, 4 emailed. Invite more →");
    expect(describeLaunchSteps({ ...copying, hasLiveInvite: false }).map(({ isDone }) => isDone)).toEqual([true, false, true, false]);
    expect(readFirstName("", "dana.whitfield@example.com")).toBe("Dana");
  });

  // Round 7: the Set up badge counts setup steps only; a flag shows on Home, not as a setup step.
  it("keeps the Set up badge at 0 on a finished setup with an open flag, which Home lists", async () => {
    await saveBranding(database, { name: "Harbor Ventures", descriptor: "", accentColor: "#0f7f86" });
    await database.insert(instanceSettings).values({ key: INSTANCE_SETTING_KEYS.firstAdminUserId, value: admin.userId }).onConflictDoNothing();
    await database.insert(memberProfile).values({ userId: admin.userId, cardStepDoneAt: new Date() }).onConflictDoUpdate({ target: memberProfile.userId, set: { cardStepDoneAt: new Date() } });
    await database.insert(invite).values({ email: "ada.founder@example.com", tokenHash: crypto.randomUUID(), invitedByName: "Admin", expiresAt: new Date(Date.now() + 14 * DAY_MS) });
    await database.insert(contentReport).values({ targetType: REPORT_TARGETS.ask, targetId: crypto.randomUUID(), reporterId: asker.userId, reportedMemberId: connector.userId, body: "A seeded ask", contentCreatedAt: new Date() });

    expect((await readNavigationBadges(database, process.env))[NAVIGATION_BADGES.admin]).toBe(0);
    expect((await readAdminHome(database, process.env)).items.map(({ id }) => id)).toContain(ADMIN_HOME_ITEMS.reports);
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
