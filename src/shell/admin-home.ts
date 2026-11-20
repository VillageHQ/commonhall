import "server-only";

import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { ROUTES } from "../platform/http/routes.ts";
import { VILLAGE_TROUBLES } from "../platform/village/health.ts";
import { ASKS_ADMIN_PAGE } from "../modules/asks/contract.ts";
import { introsManifest } from "../modules/intros/manifest.ts";
import { networkManifest } from "../modules/network/manifest.ts";
import { readInviteCounts } from "../modules/members/service-invites.ts";
import { readAdminTabFacts, type AdminTabFacts } from "./admin-badges.ts";
import { SETUP_STEPS } from "./admin-setup-steps.ts";
import { readEnabledIds } from "./enabled-modules.ts";
import { describeLaunchSteps, readIsLaunched, readLaunchFacts } from "./console-launch.ts";
import { countAsksWithNoHelp, countWaitingIntros, readThisWeek } from "./admin-this-week.ts";
import { INTRO_WAIT_DAYS } from "./admin-this-week-rules.ts";
import { asksManifest } from "../modules/asks/manifest.ts";

export const ADMIN_HOME_ITEMS = {
  setup: "setup",
  village: "village",
  villageCredits: "village-credits",
  reports: "reports",
  waitingMembers: "waiting-members",
  invites: "invites",
  stuckIntros: "stuck-intros",
  asksWithNoHelp: "asks-with-no-help",
} as const;

// Home lists at most this many things that need the admin, most urgent first.
export const MAX_HOME_ITEMS = 5;

export type AdminHomeItem = { id: (typeof ADMIN_HOME_ITEMS)[keyof typeof ADMIN_HOME_ITEMS]; label: string; href: string; isUrgent: boolean };

type AdminHomeCounts = { pendingInvites: number; stuckIntros: number; asksWithNoHelp?: number; isNetworkOn?: boolean };

// With network on, the Village item opens the Village check, which says what's wrong and links to the fix.
function readVillageHref(trouble: string | null, isNetworkOn: boolean) {
  if (isNetworkOn) return ROUTES.adminVillage;
  return trouble === VILLAGE_TROUBLES.keysRejected ? `${ROUTES.adminSettings}?step=${SETUP_STEPS.keys}` : ROUTES.adminVillage;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// What needs the admin, most urgent first. Every item is a count and a link; an item at zero is left out.
export function readAdminHomeItems(facts: AdminTabFacts, { pendingInvites, stuckIntros, asksWithNoHelp = 0, isNetworkOn = false }: AdminHomeCounts): AdminHomeItem[] {
  const items: (AdminHomeItem | null)[] = [
    facts.villageTrouble
      ? {
          id: ADMIN_HOME_ITEMS.village,
          label: facts.villageTrouble.trouble === VILLAGE_TROUBLES.keysRejected ? "Village refused your keys" : "Village isn't answering",
          href: readVillageHref(facts.villageTrouble.trouble, isNetworkOn),
          isUrgent: true,
        }
      : null,
    !facts.villageTrouble && facts.villageOutOfCreditsAt
      ? { id: ADMIN_HOME_ITEMS.villageCredits, label: "Village is out of credits: lookups are paused", href: ROUTES.adminVillage, isUrgent: true }
      : null,
    facts.reportsBadge > 0
      ? { id: ADMIN_HOME_ITEMS.reports, label: `${plural(facts.reportsBadge, "report", "reports")} waiting`, href: ROUTES.adminReports, isUrgent: true }
      : null,
    facts.membersBadge > 0
      ? { id: ADMIN_HOME_ITEMS.waitingMembers, label: `${plural(facts.membersBadge, "person", "people")} waiting for your OK`, href: ROUTES.adminMembers, isUrgent: false }
      : null,
    asksWithNoHelp > 0
      ? { id: ADMIN_HOME_ITEMS.asksWithNoHelp, label: `${plural(asksWithNoHelp, "ask has", "asks have")} no help yet`, href: ASKS_ADMIN_PAGE, isUrgent: false }
      : null,
    stuckIntros > 0
      ? { id: ADMIN_HOME_ITEMS.stuckIntros, label: `${plural(stuckIntros, "intro", "intros")} waiting over ${INTRO_WAIT_DAYS} days`, href: ROUTES.adminIntroLog, isUrgent: false }
      : null,
    pendingInvites > 0
      ? { id: ADMIN_HOME_ITEMS.invites, label: `${plural(pendingInvites, "invite", "invites")} not accepted yet`, href: ROUTES.adminInvites, isUrgent: false }
      : null,
    facts.setupStepsLeft > 0
      ? { id: ADMIN_HOME_ITEMS.setup, label: `${plural(facts.setupStepsLeft, "setup step", "setup steps")} left`, href: ROUTES.adminSettings, isUrgent: false }
      : null,
  ];
  return items.filter((item) => item !== null).slice(0, MAX_HOME_ITEMS);
}

export async function readAdminHome(database: Database, environment: Environment, now = new Date()) {
  const [facts, enabledIds, inviteCounts] = await Promise.all([readAdminTabFacts(database, environment), readEnabledIds(database), readInviteCounts(database, now)]);
  const [stuckIntros, asksWithNoHelp] = await Promise.all([
    enabledIds.has(introsManifest.id) ? countWaitingIntros(database, now) : 0,
    enabledIds.has(asksManifest.id) ? countAsksWithNoHelp(database, now) : 0,
  ]);
  return { facts, items: readAdminHomeItems(facts, { pendingInvites: inviteCounts.pending, stuckIntros, asksWithNoHelp, isNetworkOn: enabledIds.has(networkManifest.id) }) };
}

// Everything Home shows: the launch checklist until the first launch, then this week and what needs the admin.
export async function readConsoleHomePage(database: Database, environment: Environment, now = new Date()) {
  const facts = await readLaunchFacts(database, environment, now);
  const steps = describeLaunchSteps(facts);
  const isLaunched = await readIsLaunched(database, steps, now);
  const [{ items }, thisWeek] = await Promise.all([readAdminHome(database, environment, now), isLaunched ? readThisWeek(database, now) : null]);
  return { communityName: facts.communityName, steps, isLaunched, thisWeek, items };
}
