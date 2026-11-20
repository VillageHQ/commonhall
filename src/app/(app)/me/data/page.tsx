import type { Metadata } from "next";
import { Check, RefreshCw, ShieldCheck } from "lucide-react";
import { eq } from "drizzle-orm";
import Link from "next/link";
import type { ReactNode } from "react";

import { BackLink } from "@/components/page-header";
import { getDatabase } from "@/platform/database/client";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { readBrandingForPage } from "@/platform/branding/branding";
import { ROUTES } from "@/platform/http/routes";
import { isAdminMember } from "@/platform/auth/roles";
import { requireMember } from "@/platform/auth/session";
import { readEnabledModuleIds } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { formatDay, formatDayMonth } from "@/platform/text/format-date";
import { ME_PAGES } from "@/modules/members/contract-me-pages";
import { CHOICE_PLACE_WORDS } from "@/modules/members/contract-privacy";
import { FILL_IN_BASES, FILL_IN_FIELDS, LOOKUP_STATUSES } from "@/modules/members/contract-fill-in";
import { memberNetwork } from "@/modules/members/schema";
import { membersManifest } from "@/modules/members/manifest";
import { readFilledLines, readLookupState, type LookupState } from "@/modules/members/service-fill-in";
import { readPrivacy, type MemberPrivacy } from "@/modules/members/service-privacy";
import { readReportCredit } from "@/modules/members/service-report-credit";
import { SwitchesSheet } from "@/modules/members/components/your-data-switches";
import { DeleteAccountSheet, ExportSheet } from "@/modules/members/components/your-data-actions";
import { asksManifest } from "@/modules/asks/manifest";
import { feedManifest } from "@/modules/feed/manifest";
import { introsManifest } from "@/modules/intros/manifest";
import { messagesManifest } from "@/modules/messages/manifest";
import { networkManifest } from "@/modules/network/manifest";
import { readDataHome } from "@/platform/settings/data-home";

export const metadata: Metadata = { title: PAGE_TITLES.yourData };

type NetworkDates = { sharingConsentedAt: Date | null; groupJoinedAt: Date | null; villageLinkedAt: Date | null };

function Item({ term, children }: { term: ReactNode; children?: ReactNode }) {
  return (
    <li>
      <span>
        <b>{term}</b>
        {children}
      </span>
    </li>
  );
}

function RecordRow({ term, detail }: { term: ReactNode; detail: string }) {
  return (
    <li>
      <span>
        <b>{term}</b>
      </span>
      <span>{detail}</span>
    </li>
  );
}

// Where the data is kept and whom to ask, only when an admin filled them in (Settings), word for word.
function HostingLine({ communityName, location }: { communityName: string; location: string | null }) {
  if (!location) return null;
  return (
    <>
      {" "}
      <b>
        Hosted by {communityName}, {location}.
      </b>
    </>
  );
}

function DataQuestionsLine({ contactEmail }: { contactEmail: string | null }) {
  if (!contactEmail) return null;
  return (
    <p className="fh-small mt-2.5">
      Questions about your data: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
    </p>
  );
}

// The fill-in part of the consent record: the member's own yes, and the basis the admins recorded.
function readFillInRecord(lookup: LookupState, communityName: string) {
  if (lookup.refusedAt) return { lines: ["Switched off: nothing is filled in."], hasConsent: false };
  const lines: string[] = [];
  if (lookup.consentedAt) lines.push(`You agreed on ${formatDayMonth(lookup.consentedAt)}.`);
  if (lookup.basis === FILL_IN_BASES.terms) {
    lines.push(`${communityName} recorded that you agreed in its membership terms${lookup.termsDate ? ` on ${formatDay(lookup.termsDate)}` : ""}.`);
  }
  if (lines.length === 0) return { lines: ["Not yet: nothing was filled in."], hasConsent: false };
  return { lines, hasConsent: true };
}

function readLastFilledIn(lookup: LookupState) {
  if (!lookup.lookedUpAt) return "not yet";
  if (lookup.status === LOOKUP_STATUSES.found) return formatDayMonth(lookup.lookedUpAt);
  return `looked up ${formatDayMonth(lookup.lookedUpAt)}, nothing found`;
}

function readSharingDetail(network: NetworkDates | undefined) {
  if (network?.groupJoinedAt) return `since ${formatDayMonth(network.groupJoinedAt)}`;
  if (network?.sharingConsentedAt) return `agreed ${formatDayMonth(network.sharingConsentedAt)}`;
  return "never";
}

function readIntroAsksDetail(privacy: MemberPrivacy) {
  if (privacy.acceptsIntroAsks === null) return "not answered: members can ask you";
  const answer = privacy.acceptsIntroAsks ? "yes" : "no";
  const when = privacy.introAsksAnsweredAt ? `, ${formatDayMonth(privacy.introAsksAnsweredAt)}` : "";
  const where = privacy.introAsksAnsweredPlace ? `, ${CHOICE_PLACE_WORDS[privacy.introAsksAnsweredPlace]}` : "";
  return `${answer}${when}${where}`;
}

// Commonhall's Your data (member-me-data), round 6: what we hold as a short list, then the lookup service and the
// consent record folded, the two switches that live only here, the export and the real delete. Directory, intro asks
// and messages live on My profile › Privacy; sharing the network on My network; dark mode in the avatar menu.
export default modulePage(membersManifest, async function YourDataPage() {
  const member = await requireMember();
  const database = getDatabase();
  const enabledIds = await readEnabledModuleIds(database, [feedManifest, asksManifest, introsManifest, messagesManifest, networkManifest]);
  const [isFeedOn, isAsksOn, isIntrosOn, isMessagesOn, isNetworkOn] = [feedManifest, asksManifest, introsManifest, messagesManifest, networkManifest].map(({ id }) =>
    enabledIds.has(id),
  ) as [boolean, boolean, boolean, boolean, boolean];
  const [privacy, lookup, lines, [network], branding, dataHome, isCredited] = await Promise.all([
    readPrivacy(database, member.id),
    readLookupState(database, member.id),
    readFilledLines(database, member.id),
    database
      .select({ sharingConsentedAt: memberNetwork.sharingConsentedAt, groupJoinedAt: memberNetwork.groupJoinedAt, villageLinkedAt: memberNetwork.villageLinkedAt })
      .from(memberNetwork)
      .where(eq(memberNetwork.userId, member.id)),
    readBrandingForPage(),
    readDataHome(database),
    readReportCredit(database, member.id),
  ]);
  const community = branding.name;
  const fillInRecord = readFillInRecord(lookup, community);
  const hasPicture = !lookup.refusedAt && lines.some((line) => line.field === FILL_IN_FIELDS.face && line.value);

  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Your data</h1>
        <p className="fh-lede">What {community} keeps about you, and how to take it or delete it.</p>
      </header>
      <div className="fh-prof fh-section">
        <div className="fh-stack">
          <section className="fh-sheet" aria-labelledby="stored-title">
            <h2 id="stored-title" className="fh-h3 flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} /> What we hold
            </h2>
            <ul className="fh-hist fh-small mt-2">
              <Item term="Your profile">, its filled-in lines and your privacy choices.</Item>
              {isAsksOn || isFeedOn ? <Item term="Your asks and answers." /> : null}
              {isIntrosOn ? <Item term="Your intros.">{" Only the people in an intro see its note; admins see names, states and dates."}</Item> : null}
              {isMessagesOn ? <Item term="Your messages.">{" Admins can’t read them here."}</Item> : null}
              <Item term="Your email address"> (only admins see it) and a sign-in log.</Item>
            </ul>
            <p className="fh-small mt-2">
              All in this community’s own database.
              <HostingLine communityName={community} location={dataHome.location} />
            </p>
            <DataQuestionsLine contactEmail={dataHome.contact?.email ?? null} />
          </section>

          <details className="fh-sheet" aria-labelledby="lookup-title">
            <summary id="lookup-title" className="fh-h3 flex cursor-pointer items-center gap-1.5">
              <RefreshCw aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} /> What the lookup service receives
            </summary>
            {isNetworkOn || lookup.basis ? (
              <>
                <ul className="fh-hist fh-small mt-2">
                  <Item term="For the profile fill-in:">
                    {" "}
                    your email address and, once known, your LinkedIn address. It may ask its own data provider who owns an email. It sends back your role,
                    company, city and past roles.
                  </Item>
                  {isNetworkOn ? (
                    <>
                      <Item term="When you connect your network:"> your email address and a member number. It never reads email content.</Item>
                      <Item term="When you search:"> what you type.</Item>
                    </>
                  ) : null}
                </ul>
                <p className="fh-small fh-muted mt-2">Your contact list is never stored here.</p>
              </>
            ) : (
              <p className="fh-small mt-2">Nothing while network search and the profile fill-in are off.</p>
            )}
          </details>

          <details className="fh-sheet" id="consent" aria-labelledby="consent-title">
            <summary id="consent-title" className="fh-h3 flex cursor-pointer items-center gap-1.5">
              <Check aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} /> Your consent record
            </summary>
            <ul className="fh-hist fh-small mt-2">
              <li className="fh-wide">
                <span>
                  <b>Profile fill-in</b>
                </span>
                {fillInRecord.lines.map((line) => (
                  <span key={line} className="fh-rec">
                    {line}
                  </span>
                ))}
              </li>
              {fillInRecord.hasConsent ? <RecordRow term="Last filled in" detail={readLastFilledIn(lookup)} /> : null}
              {hasPicture ? (
                <li className="fh-wide">
                  <span>
                    <b>Your picture</b>
                  </span>
                  <span className="fh-rec fh-muted">From your public profile, members only. “Don’t look me up” removes it.</span>
                </li>
              ) : null}
              {isNetworkOn ? (
                <>
                  <RecordRow term="Network connected" detail={network?.villageLinkedAt ? formatDayMonth(network.villageLinkedAt) : "never"} />
                  <RecordRow term="Sharing your network with members" detail={readSharingDetail(network)} />
                </>
              ) : null}
              {isIntrosOn ? (
                // A record, not a switch: intro asks are switched on Privacy only (round 7), so its name links there.
                <RecordRow term={<Link href={ME_PAGES.privacy}>Members can ask you for intros</Link>} detail={readIntroAsksDetail(privacy)} />
              ) : null}
              {isIntrosOn ? <RecordRow term="Named in partner reports" detail={isCredited ? "yes" : "no, only counted"} /> : null}
            </ul>
          </details>
        </div>

        <div className="fh-stack">
          <SwitchesSheet lookup={lookup.basis ? { isAllowed: lookup.isAllowed } : null} reportCredit={isIntrosOn ? { isOn: isCredited } : null} />
          <ExportSheet />
          <DeleteAccountSheet communityName={community} isAdmin={isAdminMember(member)} />
        </div>
      </div>
    </>
  );
});
