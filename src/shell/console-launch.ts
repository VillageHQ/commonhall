import "server-only";

import { and, count, eq, isNotNull } from "drizzle-orm";

import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { readBranding } from "../platform/branding/branding.ts";
import { readResendConfig } from "../platform/email/resend.ts";
import { OUTBOX_STATUSES } from "../platform/email/outbox.ts";
import { emailOutbox } from "../platform/email/schema.ts";
import { ROUTES } from "../platform/http/routes.ts";
import { readSettings, saveSettings } from "../platform/settings/store.ts";
import { INSTANCE_SETTING_KEYS, instanceSettings } from "../platform/settings/schema.ts";
import { invite, memberProfile } from "../modules/members/schema.ts";
import { hasOpenOrAcceptedInvite, readInviteCounts } from "../modules/members/service-invites.ts";
import { SETUP_STEP_ORDER, SETUP_STEPS, type SetupStepId } from "./admin-setup-steps.ts";
import { GUIDED_STEPS, toGuidedStepHref } from "./guided-start.ts";

// The console's launch checklist, the one setup list (round 7: the guided start's steps and the old "four steps to
// launch" merged), each step read from the app itself. Home shows it until all four are done once; then Home is the
// dashboard for good. The Set up badge counts the steps not done (src/shell/admin-setup.ts).

export const LAUNCH_STEPS = SETUP_STEPS;

export type LaunchStepKey = SetupStepId;

export type LaunchFacts = {
  communityName: string;
  isNameSet: boolean;
  // The first admin's own card (the guided start's last step).
  isCardDone: boolean;
  // Every invite made, and how many of them were emailed (with mail off, the admin copies each link).
  invitesAdded: number;
  invitesEmailed: number;
  // An invite still open or already used (a revoked one alone doesn't count).
  hasLiveInvite: boolean;
  isMailSet: boolean;
  mailDomain: string | null;
};

// A step's words: plain text and links, in order.
export type LaunchText = readonly ({ text: string } | { text: string; href: string })[];

export type LaunchStep = { key: LaunchStepKey; title: string; isDone: boolean; text: LaunchText };

export const LAUNCH_LINKS = {
  name: ROUTES.adminSettings,
  invites: ROUTES.adminInvites,
  card: toGuidedStepHref(GUIDED_STEPS.card),
  mail: ROUTES.adminMail,
} as const;

function describeStep(key: SetupStepId, facts: LaunchFacts): LaunchStep {
  switch (key) {
    case SETUP_STEPS.name:
      return {
        key,
        title: "Your community’s name",
        isDone: facts.isNameSet,
        text: facts.isNameSet ? [] : [{ text: "Founders see it on their invite. " }, { text: "Name it →", href: LAUNCH_LINKS.name }],
      };
    case SETUP_STEPS.invite:
      return {
        key,
        title: "Invite your first founders",
        // Done once a link is made: with mail off, making it is the step (the admin copies it right there).
        isDone: facts.hasLiveInvite,
        text: facts.invitesAdded
          ? // "made", never "sent": with mail off nobody was emailed (a demo found "6 invites sent" for an import).
            [{ text: `${facts.invitesAdded} ${facts.invitesAdded === 1 ? "invite" : "invites"} made${facts.invitesEmailed ? `, ${facts.invitesEmailed} emailed` : ""}. ` }, { text: "Invite more →", href: LAUNCH_LINKS.invites }]
          : [{ text: "Paste their emails. " }, { text: "Invite founders →", href: LAUNCH_LINKS.invites }],
      };
    case SETUP_STEPS.card:
      return {
        key,
        title: "Your card",
        isDone: facts.isCardDone,
        text: facts.isCardDone ? [] : [{ text: "Founders see it in People. " }, { text: "Fill in your card →", href: LAUNCH_LINKS.card }],
      };
    case SETUP_STEPS.mail: {
      // Copying the links is a complete way to run: making links with mail off is choosing it.
      const isCopying = !facts.isMailSet && facts.hasLiveInvite;
      const text: LaunchText = facts.isMailSet
        ? []
        : isCopying
          ? [{ text: "You copy each founder’s link. To email invites instead, " }, { text: "set up mail →", href: LAUNCH_LINKS.mail }]
          : [{ text: "Copy each founder’s link from the invite, or " }, { text: "set up mail →", href: LAUNCH_LINKS.mail }];
      return { key, title: isCopying ? "Mail: you copy the links" : "Mail", isDone: facts.isMailSet || isCopying, text };
    }
  }
}

export function describeLaunchSteps(facts: LaunchFacts): LaunchStep[] {
  return SETUP_STEP_ORDER.map((key) => describeStep(key, facts));
}

function readMailDomain(fromAddress: string | null) {
  if (!fromAddress) return null;
  const address = fromAddress.match(/<([^>]+)>/)?.[1] ?? fromAddress;
  return address.split("@")[1]?.trim() || null;
}

export async function readLaunchFacts(database: Database, environment: Environment, now = new Date()): Promise<LaunchFacts> {
  const [branding, invites, hasLiveInvite, [card], [emailed]] = await Promise.all([
    readBranding(database),
    readInviteCounts(database, now),
    hasOpenOrAcceptedInvite(database),
    database
      .select({ value: count() })
      .from(memberProfile)
      .innerJoin(instanceSettings, and(eq(instanceSettings.key, INSTANCE_SETTING_KEYS.firstAdminUserId), eq(instanceSettings.value, memberProfile.userId)))
      .where(isNotNull(memberProfile.cardStepDoneAt)),
    database.select({ value: count() }).from(invite).innerJoin(emailOutbox, eq(emailOutbox.id, invite.emailOutboxId)).where(eq(emailOutbox.status, OUTBOX_STATUSES.sent)),
  ]);
  const mail = readResendConfig(environment);
  return {
    communityName: branding.name,
    isNameSet: branding.isSaved,
    isCardDone: (card?.value ?? 0) > 0,
    invitesAdded: invites.all,
    invitesEmailed: emailed?.value ?? 0,
    hasLiveInvite,
    // In demo mode mail is kept in the sending log, which counts as set up.
    isMailSet: mail !== null,
    mailDomain: readMailDomain(mail?.fromAddress ?? null),
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

// Whether Home has turned into the dashboard (Set up hides "Your plan" from then on).
export async function hasLaunched(database: Database) {
  return (await readSettings(database, [INSTANCE_SETTING_KEYS.consoleLaunchedAt])).has(INSTANCE_SETTING_KEYS.consoleLaunchedAt);
}

// "Dana" from the admin's name (its first word), else from the address ("dana.whitfield@…").
export function readFirstName(name: string | null | undefined, email: string) {
  const word = name?.trim() ? name.trim().split(/\s+/)[0]! : (email.split("@")[0]?.split(/[._+-]+/).find(Boolean) ?? "");
  return word.charAt(0).toUpperCase() + word.slice(1);
}
