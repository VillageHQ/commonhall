import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { linkedinUrl } from "@villagehq/sdk";

import { getDatabase } from "@/platform/database/client";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { SetupRows } from "@/components/ui/rows";
import { readBrandingForPage } from "@/platform/branding/branding";
import { requireMember } from "@/platform/auth/session";
import { MAXIMUM_NAME_LENGTH } from "@/platform/auth/member-name";
import { hasPassword } from "@/platform/auth/password-setup";
import { modulePage } from "@/platform/modules/module-page";
import { FILL_IN_FIELDS, type FillInField, type FilledLine } from "@/modules/members/contract-fill-in";
import { PROFILE_LIMITS } from "@/modules/members/contract-profile";
import { membersManifest } from "@/modules/members/manifest";
import { toRoleLine } from "@/modules/members/rules-words";
import { readFilledLines, readLookupState } from "@/modules/members/service-fill-in";
import { readPrivacy } from "@/modules/members/service-privacy";
import { readMemberProfile } from "@/modules/members/service-profile";
import { FilledLinesSheet, WORDED_LINE_FIELDS } from "@/modules/members/components/filled-lines-sheet";
import { LookupQuestionCard } from "@/modules/members/components/lookup-question-card";
import { OWN_FIELD_KEYS } from "@/modules/members/contract-own-words";
import { OwnWordsSheet, type OwnField } from "@/modules/members/components/own-words-sheet";
import { readOwnBooking } from "@/modules/members/service-booking";
import { ProfileHead } from "@/modules/members/components/profile-head";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { readMemberSources, readSourceJobs } from "@/modules/job-board/reads";
import { LeaveGroupCard } from "@/modules/network/components/leave-group-card";
import { networkManifest } from "@/modules/network/manifest";
import { readIsInVillageGroup, readNetworkConnectedAt } from "@/modules/network/reads-progress";
import { readAlertState } from "@/platform/notifications/reads";
import { readEnabledIds } from "@/shell/enabled-modules";
import { EDIT_CARD_HREF, readSettingsLinks, SETTINGS_KEYS, type SettingsKey } from "@/shell/settings-links";

export const metadata: Metadata = { title: PAGE_TITLES.editCard };


type Profile = NonNullable<Awaited<ReturnType<typeof readMemberProfile>>>;

function readFilledValue(lines: readonly FilledLine[], field: FillInField) {
  return lines.find((line) => line.field === field && !line.isHidden)?.value ?? null;
}

function readOwnFields(profile: Profile, lines: readonly FilledLine[]): OwnField[] {
  return [
    { key: OWN_FIELD_KEYS.name, label: "Name", ownValue: profile.name, filledValue: null, maxLength: MAXIMUM_NAME_LENGTH },
    { key: OWN_FIELD_KEYS.role, label: "Role", ownValue: profile.title ?? "", filledValue: readFilledValue(lines, FILL_IN_FIELDS.title), maxLength: PROFILE_LIMITS.title },
    { key: OWN_FIELD_KEYS.company, label: "Company", ownValue: profile.company ?? "", filledValue: readFilledValue(lines, FILL_IN_FIELDS.company), maxLength: PROFILE_LIMITS.company },
    { key: OWN_FIELD_KEYS.city, label: "City", ownValue: profile.location ?? "", filledValue: readFilledValue(lines, FILL_IN_FIELDS.location), maxLength: PROFILE_LIMITS.location },
    { key: OWN_FIELD_KEYS.stage, label: "Stage", ownValue: profile.stage ?? "", filledValue: null, maxLength: PROFILE_LIMITS.stage },
    { key: OWN_FIELD_KEYS.sector, label: "Sector", ownValue: profile.sector ?? "", filledValue: null, maxLength: PROFILE_LIMITS.sector },
    { key: OWN_FIELD_KEYS.cohort, label: "Cohort or fund", ownValue: profile.cohort ?? "", filledValue: null, maxLength: PROFILE_LIMITS.cohort },
    { key: OWN_FIELD_KEYS.workingOn, label: "Working on now", ownValue: profile.bio ?? "", filledValue: null, isLong: true, isSerif: true, maxLength: PROFILE_LIMITS.bio },
    { key: OWN_FIELD_KEYS.canHelpWith, label: "Can help with", ownValue: profile.canHelpWith ?? "", filledValue: null, isLong: true, maxLength: PROFILE_LIMITS.canHelpWith },
    { key: OWN_FIELD_KEYS.lookingFor, label: "Looking for", ownValue: profile.needs ?? "", filledValue: null, isLong: true, maxLength: PROFILE_LIMITS.needs },
    // Community's own fields, kept: tags (found by the directory's search), LinkedIn and a website.
    {
      key: OWN_FIELD_KEYS.tags,
      label: "Tags",
      ownValue: profile.tags.join(", "),
      filledValue: null,
      maxLength: (PROFILE_LIMITS.tag + 2) * PROFILE_LIMITS.tags,
      hint: `Up to ${PROFILE_LIMITS.tags}, separated by commas.`,
    },
    { key: OWN_FIELD_KEYS.linkedin, label: "LinkedIn", ownValue: profile.linkedinSlug ? linkedinUrl(profile.linkedinSlug) : "", filledValue: null, maxLength: PROFILE_LIMITS.linkedinUrl },
    { key: OWN_FIELD_KEYS.website, label: "Website", ownValue: profile.website ?? "", filledValue: null, maxLength: PROFILE_LIMITS.website },
  ];
}

const OWN_OVER_FILLED: readonly { field: FillInField; own: (profile: Profile) => string | null }[] = [
  { field: FILL_IN_FIELDS.title, own: (profile) => profile.title },
  { field: FILL_IN_FIELDS.company, own: (profile) => profile.company },
  { field: FILL_IN_FIELDS.location, own: (profile) => profile.location },
];

function readBookingHost(bookingUrl: string | null) {
  if (!bookingUrl) return "Not added";
  try {
    return new URL(bookingUrl).host;
  } catch {
    return "Added";
  }
}

function describeAlerts({ isOn, pausedUntil }: { isOn: boolean; pausedUntil: Date | null }) {
  if (!isOn) return "Off";
  return pausedUntil ? "Paused" : "On";
}

function describeOpenJobs(count: number) {
  if (count === 0) return "Add your company’s jobs";
  return count === 1 ? "1 open job" : `${count} open jobs`;
}

// Commonhall's My profile (member-me-profile): the head as members see it, the own words (round 7: one Edit card opens
// every field with one Save), the lines filled in from public profiles (folded, and only those that show), then the
// Settings list, the same as the avatar menu's, each row opening its own short page.
export default modulePage(membersManifest, async function MyProfilePage() {
  const member = await requireMember();
  const database = getDatabase();
  const profile = await readMemberProfile(database, member.id);
  if (!profile) notFound();

  const [lookup, lines, privacy, enabledIds, memberHasPassword, booking, alerts] = await Promise.all([
    readLookupState(database, member.id),
    readFilledLines(database, member.id),
    readPrivacy(database, member.id),
    readEnabledIds(database),
    hasPassword(database, member.id),
    readOwnBooking(database, member.id),
    readAlertState(database, member.id, new Date()),
  ]);
  const isNetworkOn = enabledIds.has(networkManifest.id);
  const isJobBoardOn = enabledIds.has(jobBoardManifest.id);
  const [community, networkConnectedAt, showsLeaveCard, jobSources] = await Promise.all([
    isNetworkOn && lookup.needsAnswer ? readBrandingForPage() : null,
    isNetworkOn ? readNetworkConnectedAt(database, member.id) : null,
    isNetworkOn ? false : readIsInVillageGroup(database, member.id),
    isJobBoardOn ? readMemberSources(database, member.id) : null,
  ]);
  const jobsBySource = jobSources ? await readSourceJobs(database, jobSources.map(({ id }) => id)) : null;
  const openJobCount = jobsBySource ? [...jobsBySource.values()].reduce((total, jobs) => total + jobs.length, 0) : 0;
  const isRefused = lookup.refusedAt !== null;
  // A filled-in line shows only where it applies: not where the member's own words show instead.
  const overridden = new Set(OWN_OVER_FILLED.filter(({ own }) => Boolean(own(profile))).map(({ field }) => field));
  const shownLines = isRefused ? [] : lines.filter((line) => !overridden.has(line.field));
  const hasFilledLines = shownLines.some((line) => line.field === FILL_IN_FIELDS.pastRoles || WORDED_LINE_FIELDS.includes(line.field));

  // The Settings list, the same as the avatar menu's (settings-links.ts); here each row says where it stands.
  const descriptions: Record<SettingsKey, string> = {
    [SETTINGS_KEYS.card]: "Edit every field, one Save",
    [SETTINGS_KEYS.privacy]: privacy.isHidden ? "Hidden from People" : "Shown to members",
    [SETTINGS_KEYS.alerts]: describeAlerts(alerts),
    [SETTINGS_KEYS.email]: "The weekly email and what reaches your inbox",
    [SETTINGS_KEYS.booking]: readBookingHost(booking.bookingUrl),
    [SETTINGS_KEYS.network]: networkConnectedAt ? "Connected" : "Not connected",
    [SETTINGS_KEYS.jobs]: describeOpenJobs(openJobCount),
    [SETTINGS_KEYS.data]: "Export, public-profile lookups, delete",
    [SETTINGS_KEYS.password]: memberHasPassword ? "Password or email link" : "Email link",
  };
  const settings = readSettingsLinks(enabledIds).map(({ key, label, href }) => ({
    href: key === SETTINGS_KEYS.card ? EDIT_CARD_HREF : href,
    title: label,
    description: descriptions[key],
  }));

  return (
    <>
      <ProfileHead
        memberId={profile.id}
        name={profile.name}
        imageUrl={profile.shown.imageUrl}
        companyLogoUrl={profile.shown.companyLogoUrl}
        hasCompany={Boolean(profile.shown.company)}
        roleLine={toRoleLine(profile.shown)}
      />

      <div className="fh-prof fh-section">
        <div>
          <OwnWordsSheet fields={readOwnFields(profile, lines)} />
          {community && isNetworkOn && lookup.needsAnswer ? (
            <div className="mt-4">
              <LookupQuestionCard communityName={community.name} />
            </div>
          ) : null}
          {hasFilledLines ? (
            <div className="mt-4">
              <FilledLinesSheet lines={shownLines} refreshedAt={lookup.lookedUpAt?.toISOString() ?? null} isOwn emptyNote={null} isFolded />
            </div>
          ) : null}
        </div>
        <div className="fh-stack">
          {/* The old sheets' anchors (/me#privacy, #booking, #network, #jobs) land on these rows. */}
          <section aria-labelledby="settings-title" className="fh-sheet">
            <h2 id="settings-title" className="fh-h3">
              Settings
            </h2>
            <span id="privacy" />
            <span id="booking" />
            <span id="network" />
            <span id="jobs" />
            <SetupRows rows={settings} />
          </section>
          {showsLeaveCard ? <LeaveGroupCard /> : null}
        </div>
      </div>
    </>
  );
});
