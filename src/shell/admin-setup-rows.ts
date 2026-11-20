import "server-only";

import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { readMailSettings } from "../platform/email/mail-settings.ts";
import { readResendConfig } from "../platform/email/resend.ts";
import { ROUTES } from "../platform/http/routes.ts";
import { MODULE_KINDS } from "../platform/modules/manifest.ts";
import { readVillageKeys } from "../platform/village/settings.ts";
import { readOpenReportCount } from "../modules/admin/service-reports.ts";
import { ANNOUNCEMENT_PAGE } from "../modules/admin/contract-announcements.ts";
import { CHAT_ADMIN_PAGE } from "../modules/chat/contract.ts";
import { chatManifest } from "../modules/chat/manifest.ts";
import { readChatConnections } from "../modules/chat/service.ts";
import { JOB_BOARD_PAGES } from "../modules/job-board/contract.ts";
import { jobBoardManifest } from "../modules/job-board/manifest.ts";
import { networkManifest } from "../modules/network/manifest.ts";
import { PERKS_ADMIN_PAGE } from "../modules/perks/contract.ts";
import { perksManifest } from "../modules/perks/manifest.ts";
import { readPerksUrl } from "../modules/perks/service.ts";
import { MODULES } from "../modules/registry.ts";
import { VOICE_ADMIN_PAGE } from "../modules/voice/contract.ts";
import { voiceManifest } from "../modules/voice/manifest.ts";
import { readVoiceConfig } from "../modules/voice/service-settings.ts";
import { readEnabledIds } from "./enabled-modules.ts";
import { readWeeklyEmailPlan } from "./weekly-email-settings.ts";

// Set up (round 6: one page, /admin/settings): Mail, the weekly email, Features and network search in view, beside the branding; every page for an
// engineer folded under Advanced. Each row has one short line and whether it is set up. A state is "done" (Set up),
// "todo" (Not yet), "needs" (a count that needs a look) or a small word of its own.
export const SETUP_ROW_STATES = { done: "done", todo: "todo", needs: "needs", word: "word" } as const;

export const SETUP_ROW_PLACES = { essential: "essential", advanced: "advanced" } as const;

export type SetupRowState =
  | { kind: typeof SETUP_ROW_STATES.done }
  | { kind: typeof SETUP_ROW_STATES.todo }
  | { kind: typeof SETUP_ROW_STATES.needs; text: string }
  | { kind: typeof SETUP_ROW_STATES.word; text: string };

export type SetupRow = {
  key: string;
  title: string;
  href: string;
  description: string;
  state: SetupRowState;
  place: (typeof SETUP_ROW_PLACES)[keyof typeof SETUP_ROW_PLACES];
};

export type SetupFacts = {
  isMailOn: boolean;
  hasSendingDomain: boolean;
  isNetworkOn: boolean;
  hasVillageKeys: boolean;
  isChatOn: boolean;
  isChatPosting: boolean;
  isPerksOn: boolean;
  isPerksShown: boolean;
  isVoiceOn: boolean;
  isVoiceReady: boolean;
  isJobBoardOn: boolean;
  featuresOn: number;
  openReports: number;
  // "Thu 09:00 UTC": when the weekly email goes out; null while it is off.
  weeklyEmailWhen: string | null;
};

// Set up's Weekly email row opens Announce with the schedule open (round 7).
export const WEEKLY_EMAIL_SCHEDULE_HREF = `${ANNOUNCEMENT_PAGE}?schedule=open#weekly-heading`;

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Thu 09:00 UTC" from a saved schedule.
export function describeWeeklyEmailWhen({ weekday, hour, timeZone }: { weekday: number; hour: number; timeZone: string }) {
  return `${SHORT_WEEKDAYS[weekday] ?? ""} ${String(hour).padStart(2, "0")}:00 ${timeZone.replace(/_/g, " ")}`;
}

const done = { kind: SETUP_ROW_STATES.done } as const;
const todo = { kind: SETUP_ROW_STATES.todo } as const;
const word = (text: string) => ({ kind: SETUP_ROW_STATES.word, text }) as const;
const isDone = (isSet: boolean) => (isSet ? done : todo);
const OFF = word("off");
const OPTIONAL = word("optional");
const { essential, advanced } = SETUP_ROW_PLACES;

// A switched-off feature's page answers 404, so its row leads to its own switch on Features.
function readSwitchHref(moduleId: string) {
  return `${ROUTES.adminFeatures}#feature-card-${moduleId}`;
}

export function readSetupRows(facts: SetupFacts): SetupRow[] {
  return [
    { key: "mail", title: "Mail", href: ROUTES.adminMail, description: "Invites and emails come from your domain.", state: isDone(facts.isMailOn && facts.hasSendingDomain), place: essential },
    {
      key: "weekly-email",
      title: "Weekly email",
      href: WEEKLY_EMAIL_SCHEDULE_HREF,
      description: "What each member gets once a week. Change its day and time.",
      state: word(facts.weeklyEmailWhen ?? "off"),
      place: essential,
    },
    { key: "features", title: "Features", href: ROUTES.adminFeatures, description: "Switch parts of the portal on or off.", state: word(`${facts.featuresOn} on`), place: essential },
    // Round 7: Village is no step of the first run; network search is an optional row, in view.
    {
      key: "village",
      title: "Network search",
      href: facts.isNetworkOn ? ROUTES.adminVillage : readSwitchHref(networkManifest.id),
      description: "Connect Village to search members' networks for warm paths. Optional.",
      state: facts.isNetworkOn ? (facts.hasVillageKeys ? done : OPTIONAL) : OFF,
      place: essential,
    },
    {
      key: "rooms",
      title: "Rooms server",
      href: facts.isVoiceOn ? VOICE_ADMIN_PAGE : readSwitchHref(voiceManifest.id),
      description: "The voice server live rooms run on.",
      state: facts.isVoiceOn ? isDone(facts.isVoiceReady) : OFF,
      place: advanced,
    },
    {
      key: "integrations",
      title: "Slack and Discord",
      href: facts.isChatOn ? CHAT_ADMIN_PAGE : readSwitchHref(chatManifest.id),
      description: "New asks in your chat.",
      state: facts.isChatOn && facts.isChatPosting ? done : OPTIONAL,
      place: advanced,
    },
    {
      key: "perks",
      title: "Perks",
      // The Perks page stays open while Perks is off: its "Show Perks to members" switch turns it on.
      href: PERKS_ADMIN_PAGE,
      description: "Your perks marketplace.",
      state: facts.isPerksOn && facts.isPerksShown ? done : OPTIONAL,
      place: advanced,
    },
    {
      key: "jobs",
      title: "Job board",
      href: facts.isJobBoardOn ? JOB_BOARD_PAGES.admin : readSwitchHref(jobBoardManifest.id),
      description: "The public board and its embed.",
      state: facts.isJobBoardOn ? word("on") : OFF,
      place: advanced,
    },
    { key: "mail-log", title: "Mail log", href: `${ROUTES.adminMail}#log`, description: "What was sent, and what bounced.", state: word("always on"), place: advanced },
    { key: "audit", title: "Audit log", href: ROUTES.adminAuditLog, description: "Every admin action.", state: word("always on"), place: advanced },
    {
      key: "reports",
      title: "Flagged",
      href: ROUTES.adminReports,
      description: "Posts, asks and messages members reported.",
      state: facts.openReports > 0 ? { kind: SETUP_ROW_STATES.needs, text: `${facts.openReports} open` } : word("none open"),
      place: advanced,
    },
    { key: "start", title: "Guided start", href: ROUTES.adminStart, description: "The first-run steps, one screen each.", state: OPTIONAL, place: advanced },
  ];
}

export async function readSetupPage(database: Database, environment: Environment) {
  const enabledIds = await readEnabledIds(database);
  const isNetworkOn = enabledIds.has(networkManifest.id);
  const isChatOn = enabledIds.has(chatManifest.id);
  const isPerksOn = enabledIds.has(perksManifest.id);
  const isVoiceOn = enabledIds.has(voiceManifest.id);
  const [mail, keys, chats, perksUrl, openReports, voiceConfig, weeklyEmail] = await Promise.all([
    readMailSettings(database),
    isNetworkOn ? readVillageKeys(database, environment) : null,
    isChatOn ? readChatConnections(database) : [],
    isPerksOn ? readPerksUrl(database) : null,
    readOpenReportCount(database),
    isVoiceOn ? readVoiceConfig(database, environment) : null,
    readWeeklyEmailPlan(database),
  ]);
  const config = readResendConfig(environment);
  const facts: SetupFacts = {
    isMailOn: config !== null,
    hasSendingDomain: Boolean(mail.domain) || /@[^>\s]+/.test(config?.fromAddress ?? ""),
    isNetworkOn,
    hasVillageKeys: keys !== null,
    isChatOn,
    isChatPosting: chats.some(({ channelId, isPaused }) => Boolean(channelId) && !isPaused),
    isPerksOn,
    isPerksShown: perksUrl !== null,
    isVoiceOn,
    isVoiceReady: voiceConfig !== null,
    isJobBoardOn: enabledIds.has(jobBoardManifest.id),
    featuresOn: MODULES.filter(({ manifest }) => manifest.kind === MODULE_KINDS.toggleable && enabledIds.has(manifest.id)).length,
    openReports,
    weeklyEmailWhen: weeklyEmail.isEnabled ? describeWeeklyEmailWhen(weeklyEmail.schedule) : null,
  };
  return readSetupRows(facts);
}
