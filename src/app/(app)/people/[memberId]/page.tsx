import type { Metadata } from "next";
import { ArrowLeftRight, ExternalLink, Pencil, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { FieldBlock } from "@/components/ui/rows";
import { Tag, Tags } from "@/components/ui/tag";
import { getDatabase } from "@/platform/database/client";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { FILL_IN_FIELDS, readPastRoles, toRoleYears } from "@/modules/members/contract-fill-in";
import { readExternalHost } from "@/modules/members/rules-external-url";
import { readFirstWord, toPossessive, toRoleLine } from "@/modules/members/rules-words";
import { isBlockedBy } from "@/modules/members/service-blocks";
import { readFilledLines, readLookupState } from "@/modules/members/service-fill-in";
import { readMemberProfile } from "@/modules/members/service-profile";
import { isHiddenMember, readAcceptsIntroAsks } from "@/modules/members/service-privacy";
import { introsManifest } from "@/modules/intros/manifest";
import { networkManifest } from "@/modules/network/manifest";
import { readMemberReach } from "@/modules/network/reads-member-reach";
import { ROUTES } from "@/platform/http/routes";
import { requireMember } from "@/platform/auth/session";
import { linkedinUrl } from "@villagehq/sdk";
import { isAdminMember } from "@/platform/auth/roles";

import { BlockMemberButton } from "@/modules/members/components/block-member-button";
import { PersonHead } from "@/modules/members/components/profile-head";
import { ProfileActions, ProfileMore } from "@/modules/members/components/profile-actions";
import { MemberConversationSlot } from "@/modules/members/slots";
import { INBOX_QUERY_FILTER } from "@/modules/messages/queries";
import { AdminMemberPanel } from "@/modules/members/components/admin-member-panel";
import { membersManifest } from "@/modules/members/manifest";
import { modulePage } from "@/platform/modules/module-page";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { BookCallButton } from "@/modules/members/components/book-call-button";
import { RoomMuteButton } from "@/components/alerts/room-mute-button";
import { voiceManifest } from "@/modules/voice/manifest";
import { readMutedPeople } from "@/platform/notifications/reads";
import { COMMUNITY_ROLE_LABELS, COMMUNITY_ROLES } from "@/modules/members/contract-community-roles";
import { readShownBooking } from "@/modules/members/service-booking";
import { wereIntroducedForBooking } from "@/shell/booking-access";
import { CompanyJobsCard } from "@/modules/job-board/components/shared/company-jobs-card";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { readCompanyJobs } from "@/modules/job-board/reads-hiring";
import { messagesManifest } from "@/modules/messages/manifest";
import { readApplyByMessageHref } from "@/shell/job-apply-message";

type ProfilePageProps = { params: Promise<{ memberId: string }> };

// The tab reads "Ada Okafor · Northwind Founders", as Commonhall's does. A member hidden from the directory keeps
// the plain title, so their name never shows on a page that answers "not found".
export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { memberId } = await params;
  const database = getDatabase();
  const profile = await readMemberProfile(database, memberId);
  // The page answers 404 for both, so the tab says so too.
  if (!profile || (await isHiddenMember(database, profile.id))) return { title: PAGE_TITLES.notFound };
  return { title: profile.name };
}

const EXTERNAL_LINK_RELATIONSHIP = "noopener noreferrer nofollow";

function ExternalLinkLine({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel={EXTERNAL_LINK_RELATIONSHIP} aria-label={`${label} (opens in a new tab)`} className="mr-4 inline-flex items-center gap-1">
      {label}
      <ExternalLink aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
    </a>
  );
}

// A member's profile (round 8, ui-polish Part 5): the stacked head with one action row (two equal buttons and "More",
// which holds the room alerts switch, Block and, when Book a call takes its place, Message), the member's own words,
// their past roles from public profiles, and "Who <first name> can introduce you to".
export default modulePage(membersManifest, async function MemberProfilePage({ params }: ProfilePageProps) {
  const viewer = await requireMember();
  const { memberId } = await params;
  const database = getDatabase();
  const profile = await readMemberProfile(database, memberId);
  if (!profile) notFound();

  const isOwnProfile = viewer.id === profile.id;
  // "Hide me from the directory": members can't open the profile either. Admins still can.
  if (!isOwnProfile && !isAdminMember(viewer) && (await isHiddenMember(database, profile.id))) notFound();
  const isBlockedByViewer = !isOwnProfile && (await isBlockedBy(database, viewer.id, profile.id));
  const [isIntrosOn, isNetworkOn, isJobBoardOn, isRoomsOn, isMessagingOn, lookup, lines] = await Promise.all([
    isModuleEnabled(database, introsManifest),
    isModuleEnabled(database, networkManifest),
    isModuleEnabled(database, jobBoardManifest),
    isModuleEnabled(database, voiceManifest),
    isModuleEnabled(database, messagesManifest),
    readLookupState(database, profile.id),
    readFilledLines(database, profile.id),
  ]);
  // "Don't notify me about <first name>'s rooms": the viewer's mute of this member's room starts, while Rooms is on.
  const isRoomsMuted = isRoomsOn && !isOwnProfile ? (await readMutedPeople(database, viewer.id)).some(({ id }) => id === profile.id) : false;
  // With search on, the admins' "chosen introducers" rule decides who can be asked, as it does on the server.
  const reach = isNetworkOn && !isOwnProfile ? await readMemberReach(database, profile.id) : null;
  const acceptsAsks = await readAcceptsIntroAsks(database, profile.id);
  const showsAsk = isIntrosOn && !isOwnProfile && !isBlockedByViewer && (reach?.isIntroducer ?? true);
  const first = readFirstWord(profile.name);
  const { shown } = profile;
  const chips = [profile.stage, profile.sector, profile.cohort].filter((chip): chip is string => Boolean(chip));
  const roleChip = profile.communityRole === COMMUNITY_ROLES.founder ? null : COMMUNITY_ROLE_LABELS[profile.communityRole];
  // Never on your own profile, and only when this viewer may see the link.
  const bookingUrl = isOwnProfile ? null : await readShownBooking(database, viewer.id, profile.id, wereIntroducedForBooking);
  const ownWords = [
    { key: "working_on", label: "Working on now", value: profile.bio, isSerif: true },
    { key: "can_help_with", label: "Can help with", value: profile.canHelpWith, isSerif: false },
    { key: "looking_for", label: "Looking for", value: profile.needs, isSerif: false },
  ].filter((field) => field.value);
  // Role, company and city already show in the head; only the past roles add something here.
  const pastRolesLine = lookup.refusedAt === null ? lines.find((line) => line.field === FILL_IN_FIELDS.pastRoles && !line.isHidden) : undefined;
  const pastRoles = readPastRoles(pastRolesLine?.value);
  const companyJobs = isJobBoardOn ? await readCompanyJobs(database, { company: shown.company, memberId: profile.id }) : null;
  // The action row (round 8): the primary is "Ask for an intro", or Message when asks can't be made; the outlined
  // second is "Book a call" where it shows, else Message. A Message with no place in the row moves into "More".
  const canAsk = showsAsk && acceptsAsks;
  const askButton = canAsk ? (
    <Button asChild variant="primary" size="sm">
      <Link href={`${ROUTES.intros}/new?via=${encodeURIComponent(profile.id)}`} aria-label={`Ask for an intro via ${first}`}>
        <ArrowLeftRight aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
        Ask for an intro
      </Link>
    </Button>
  ) : null;
  const messageButton = (variant: "primary" | "secondary") =>
    isMessagingOn ? <MemberConversationSlot memberId={profile.id} label="Message" accessibleName={`Message ${profile.name}`} variant={variant} size="sm" showsIcon /> : null;
  const bookButton = bookingUrl ? <BookCallButton memberId={profile.id} memberName={profile.name} bookingUrl={bookingUrl} variant="secondary" /> : null;
  const secondButton = canAsk ? (bookButton ?? messageButton("secondary")) : bookButton;
  const isMessageInMore = isMessagingOn && canAsk && bookButton !== null;
  // With no ask to make, Message leads, and Book a call (where it shows) follows.
  const leadButton = askButton ?? messageButton("primary");

  return (
    <div className="fh-profile-page">
      <BackLink href={ROUTES.members}>People</BackLink>
      <PersonHead
        memberId={profile.id}
        name={profile.name}
        imageUrl={shown.imageUrl}
        companyLogoUrl={shown.companyLogoUrl}
        hasCompany={Boolean(shown.company)}
        headline={toRoleLine({ ...shown, location: null })}
        place={shown.location}
      >
        {chips.length > 0 || roleChip ? (
          <Tags className="fh-person-tags">
            {roleChip ? <Tag tone="accent">{roleChip}</Tag> : null}
            {chips.map((chip) => (
              <Tag key={chip}>{chip}</Tag>
            ))}
          </Tags>
        ) : null}
        {isOwnProfile ? (
          <ProfileActions count={1}>
            <Button asChild variant="primary" size="sm">
              <Link href={ROUTES.editCard}>
                <Pencil aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
                Edit my profile
              </Link>
            </Button>
          </ProfileActions>
        ) : (
          <>
            <ProfileActions
              count={[leadButton, secondButton].filter(Boolean).length}
              more={
                <ProfileMore name={profile.name}>
                  {isMessageInMore ? (
                    <MemberConversationSlot memberId={profile.id} label="Message" accessibleName={`Message ${profile.name}`} variant="quiet" className="fh-person-menu-row" showsIcon />
                  ) : null}
                  {isRoomsOn ? <RoomMuteButton memberId={profile.id} firstName={first} isMuted={isRoomsMuted} /> : null}
                  <BlockMemberButton memberId={profile.id} memberName={profile.name} isBlocked={isBlockedByViewer} refreshesAfterChange={INBOX_QUERY_FILTER} />
                </ProfileMore>
              }
            >
              {leadButton}
              {secondButton}
            </ProfileActions>
            {showsAsk && !acceptsAsks ? <p className="fh-person-note">{first} has paused intro asks.</p> : null}
          </>
        )}
      </PersonHead>

      <div className="fh-prof">
        <div>
          <section className="fh-sheet" aria-label={`In ${toPossessive(first)} own words`}>
            {ownWords.length > 0 || profile.tags.length > 0 || profile.linkedinSlug || profile.website ? (
              <>
                {ownWords.map((field) => (
                  <FieldBlock key={field.key} label={field.label} isSerif={field.isSerif}>
                    <p className="whitespace-pre-line">{field.value}</p>
                  </FieldBlock>
                ))}
                {profile.tags.length > 0 ? (
                  <FieldBlock label="Tags">
                    <Tags>
                      {profile.tags.map((tag) => (
                        <Tag key={tag}>{tag}</Tag>
                      ))}
                    </Tags>
                  </FieldBlock>
                ) : null}
                {profile.linkedinSlug || profile.website ? (
                  <FieldBlock label="Links">
                    {profile.linkedinSlug ? <ExternalLinkLine href={linkedinUrl(profile.linkedinSlug)} label="LinkedIn" /> : null}
                    {profile.website ? <ExternalLinkLine href={profile.website} label={readExternalHost(profile.website)} /> : null}
                  </FieldBlock>
                ) : null}
              </>
            ) : (
              <p className="fh-muted mt-2">{first} hasn’t written anything yet.</p>
            )}
          </section>
          {pastRoles.length > 0 ? (
            <section className="fh-sheet" aria-label="Past roles, from public profiles">
              <div className="fh-source">
                <RefreshCw aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
                Past roles · from public profiles
              </div>
              <ul className="fh-hist">
                {pastRoles.map((role, position) => (
                  <li key={`${role.title}-${position}`}>
                    <span>
                      <b>{role.title}</b>
                      {role.company ? `, ${role.company}` : ""}
                    </span>
                    <span>{toRoleYears(role)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <div className="fh-stack">
          {reach ? (
            <section className="fh-sheet">
              <h2 className="fh-h3">Who {first} can introduce you to</h2>
              {reach.sharesNetwork ? (
                <>
                  <p className="fh-small mt-1.5">You see who {first} knows, never the contact list.</p>
                  <div className="fh-btn-row mt-3">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={ROUTES.network}>
                        <Search aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
                        Search
                      </Link>
                    </Button>
                  </div>
                </>
              ) : reach.isIntroducer ? (
                <p className="fh-small fh-muted mt-1.5">{first} hasn’t shared a network yet.</p>
              ) : (
                <p className="fh-small fh-muted mt-1.5">Intros here go through members the admins chose.</p>
              )}
            </section>
          ) : null}
          {companyJobs && shown.company ? <CompanyJobsCard company={shown.company} companyJobs={companyJobs} applyByMessageHref={readApplyByMessageHref(viewer.id, isMessagingOn)} /> : null}
        </div>
      </div>

      {isAdminMember(viewer) ? (
        <div className="fh-section">
          <AdminMemberPanel email={profile.email} isEmailConfirmed={profile.emailVerified} isLinkedinConfirmed={profile.isLinkedinConfirmed} />
        </div>
      ) : null}
    </div>
  );
});
