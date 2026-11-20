import "server-only";

import { and, count, eq } from "drizzle-orm";

import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { readBranding } from "../platform/branding/branding.ts";
import { readResendConfig } from "../platform/email/resend.ts";
import { OUTBOX_STATUSES } from "../platform/email/outbox.ts";
import { emailOutbox } from "../platform/email/schema.ts";
import { readSettings, saveSettings } from "../platform/settings/store.ts";
import { INSTANCE_SETTING_KEYS } from "../platform/settings/schema.ts";
import { readVillageKeys } from "../platform/village/settings.ts";
import { INTRO_STATES } from "../modules/intros/contract.ts";
import { introRequest } from "../modules/intros/schema.ts";
import { invite } from "../modules/members/schema.ts";
import { readInviteCounts } from "../modules/members/service-invites.ts";
import { networkManifest } from "../modules/network/manifest.ts";
import { readVillageGroup } from "../modules/network/service-settings.ts";
import { readEnabledIds } from "./enabled-modules.ts";

// The console's launch checklist (Commonhall's): four steps from a fresh install to the first partner report, each
// read from the app itself. Home shows it until all four are done once; then Home is the dashboard for good.

export const LAUNCH_STEPS = { look: "look", invite: "invite", plumbing: "plumbing", report: "report" } as const;

export type LaunchStepKey = (typeof LAUNCH_STEPS)[keyof typeof LAUNCH_STEPS];

export type LaunchFacts = {
  communityName: string;
  isLookSet: boolean;
  hasLogo: boolean;
  // Every invite made, and how many of them were emailed (an import with email off adds people and emails nobody).
  invitesAdded: number;
  invitesEmailed: number;
  invitesJoined: number;
  isMailSet: boolean;
  isNetworkSet: boolean;
  mailDomain: string | null;
  hasMadeIntro: boolean;
};

// A step's words: plain text and links, in order.
export type LaunchText = readonly ({ text: string } | { text: string; href: string })[];

export type LaunchStep = { key: LaunchStepKey; title: string; isDone: boolean; text: LaunchText };

export const LAUNCH_LINKS = {
  look: "/admin/settings",
  invites: "/admin/invites",
  links: "/admin/links",
  mail: "/admin/mail",
  village: "/admin/village",
  report: "/admin/report",
} as const;

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function describeLaunchSteps(facts: LaunchFacts): LaunchStep[] {
  // The look is done with a logo: a saved name alone still shows initials on every page.
  const isLookDone = facts.isLookSet && facts.hasLogo;
  // A done step shows only its title and its tick.
  const look: LaunchText = isLookDone
    ? []
    : facts.isLookSet
      ? [{ text: "Members still see your initials. " }, { text: "Add your logo →", href: LAUNCH_LINKS.look }]
      : [{ text: "Name, colour and logo. " }, { text: "Set your look →", href: LAUNCH_LINKS.look }];
  const unsent = facts.invitesAdded - facts.invitesEmailed;
  const invite: LaunchText = !facts.invitesAdded
    ? [{ text: "Paste 10–20 emails. " }, { text: "Invite founders →", href: LAUNCH_LINKS.invites }]
    : unsent === 0
      ? [{ text: `${facts.invitesAdded} ${plural(facts.invitesAdded, "invite", "invites")} sent. ` }, { text: "Invite more →", href: LAUNCH_LINKS.invites }]
      : [
          { text: facts.invitesEmailed ? `${facts.invitesAdded} added, ${facts.invitesEmailed} emailed. ` : `${facts.invitesAdded} added, no email sent yet. ` },
          { text: `Send ${plural(unsent, "their link", "their links")} →`, href: LAUNCH_LINKS.links },
        ];
  const plumbing: LaunchText =
    facts.isMailSet && facts.isNetworkSet
      ? []
      : [
          ...(facts.isMailSet ? [] : [{ text: "Set up mail", href: LAUNCH_LINKS.mail }, { text: ". " }]),
          ...(facts.isNetworkSet ? [] : [{ text: "Connect Village", href: LAUNCH_LINKS.village }, { text: "." }]),
        ];
  const report: LaunchText = facts.hasMadeIntro ? [{ text: "Open the partner report →", href: LAUNCH_LINKS.report }] : [{ text: "Appears with the first intro." }];
  return [
    { key: LAUNCH_STEPS.look, title: "Your fund’s look", isDone: isLookDone, text: look },
    // Done once an invite reached someone: emailed, or used to join (a link sent by hand).
    { key: LAUNCH_STEPS.invite, title: "Invite your first founders", isDone: facts.invitesEmailed > 0 || facts.invitesJoined > 0, text: invite },
    { key: LAUNCH_STEPS.plumbing, title: "Mail and the network", isDone: facts.isMailSet && facts.isNetworkSet, text: plumbing },
    { key: LAUNCH_STEPS.report, title: "Your first partner report", isDone: facts.hasMadeIntro, text: report },
  ];
}

function readMailDomain(fromAddress: string | null) {
  if (!fromAddress) return null;
  const address = fromAddress.match(/<([^>]+)>/)?.[1] ?? fromAddress;
  return address.split("@")[1]?.trim() || null;
}

export async function readLaunchFacts(database: Database, environment: Environment, now = new Date()): Promise<LaunchFacts> {
  const enabledIds = await readEnabledIds(database);
  const isNetworkOn = enabledIds.has(networkManifest.id);
  const [branding, invites, keys, group, [made], [emailed]] = await Promise.all([
    readBranding(database),
    readInviteCounts(database, now),
    isNetworkOn ? readVillageKeys(database, environment) : null,
    isNetworkOn ? readVillageGroup(database) : null,
    database
      .select({ value: count() })
      .from(introRequest)
      .where(and(eq(introRequest.state, INTRO_STATES.completed), eq(introRequest.isWithheld, false))),
    database.select({ value: count() }).from(invite).innerJoin(emailOutbox, eq(emailOutbox.id, invite.emailOutboxId)).where(eq(emailOutbox.status, OUTBOX_STATUSES.sent)),
  ]);
  const mail = readResendConfig(environment);
  return {
    communityName: branding.name,
    isLookSet: branding.isSaved,
    hasLogo: branding.logo !== null,
    invitesAdded: invites.all,
    invitesEmailed: emailed?.value ?? 0,
    invitesJoined: invites.accepted,
    // In demo mode mail is kept in the sending log, which counts as set up.
    isMailSet: mail !== null,
    // With the network switched off there is no Village to connect.
    isNetworkSet: !isNetworkOn || (keys !== null && group !== null),
    mailDomain: readMailDomain(mail?.fromAddress ?? null),
    hasMadeIntro: (made?.value ?? 0) > 0,
  };
}

// Home shows the checklist until all four steps are done once. The first time they are, that moment is saved, and
// Home is the dashboard from then on (the checklist stays one link away: /admin?checklist=1).
export async function readIsLaunched(database: Database, steps: readonly LaunchStep[], now = new Date()) {
  const settings = await readSettings(database, [INSTANCE_SETTING_KEYS.consoleLaunchedAt]);
  if (settings.has(INSTANCE_SETTING_KEYS.consoleLaunchedAt)) return true;
  if (!steps.every(({ isDone }) => isDone)) return false;
  await saveSettings(database, { [INSTANCE_SETTING_KEYS.consoleLaunchedAt]: now.toISOString() });
  return true;
}

// "Dana" from the admin's name (its first word), else from the address ("dana.whitfield@…").
export function readFirstName(name: string | null | undefined, email: string) {
  const word = name?.trim() ? name.trim().split(/\s+/)[0]! : (email.split("@")[0]?.split(/[._+-]+/).find(Boolean) ?? "");
  return word.charAt(0).toUpperCase() + word.slice(1);
}
