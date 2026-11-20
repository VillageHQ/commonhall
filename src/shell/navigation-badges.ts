import "server-only";

import { introsManifest } from "../modules/intros/manifest.ts";
import { readIntroCounts } from "../modules/intros/reads.ts";
import { countIntrosForTarget } from "../modules/intros/reads-target-member.ts";
import { countLiveRooms } from "../modules/voice/reads-live.ts";
import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { readAdminTabFacts } from "./admin-badges.ts";
import { NAVIGATION_BADGES, type NavigationBadgeCounts } from "./navigation-rules.ts";

export async function readNavigationBadges(database: Database, environment: Environment): Promise<NavigationBadgeCounts> {
  // Set up's badge counts setup steps left only (round 7): flags, waiting members and Village trouble are on Home.
  const { setupStepsLeft } = await readAdminTabFacts(database, environment);
  return { [NAVIGATION_BADGES.admin]: setupStepsLeft };
}

async function readIntrosWaitingForYes(database: Database, memberId: string) {
  const [{ waitingOnYou }, forYou] = await Promise.all([readIntroCounts(database, memberId), countIntrosForTarget(database, memberId)]);
  return { [NAVIGATION_BADGES.introsWaiting]: waitingOnYou, [NAVIGATION_BADGES.introsForYou]: forYou };
}

// The member tabs' own counts: the intro asks waiting for your yes (the Inbox adds unread messages) and the live rooms
// (the Rooms dot; 0 while Rooms is off).
export async function readMemberTabBadges(database: Database, memberId: string, enabledIds: ReadonlySet<string>): Promise<NavigationBadgeCounts> {
  const [intros, live] = await Promise.all([enabledIds.has(introsManifest.id) ? readIntrosWaitingForYes(database, memberId) : {}, countLiveRooms(database, memberId)]);
  return { ...intros, [NAVIGATION_BADGES.live]: live };
}
