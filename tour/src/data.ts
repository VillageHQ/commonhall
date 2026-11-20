import type { BoardPost, AskTabCounts } from "@/modules/asks/reads-board";
import type { AskAllowance, AskMember } from "@/modules/asks/contract";
import type { Directory, DirectoryMember } from "@/modules/members/contract-profile";
import type { NetworkSearchResult } from "@/modules/network/contract";
import type { ConsoleHome } from "@/shell/console-home";
import type { ComposerCohort, ComposerMember } from "@/modules/admin/components/announcement-composer";
import type { SentAnnouncement } from "@/modules/admin/reads-announcements";
import { ANNOUNCEMENT_AUDIENCES } from "@/modules/admin/contract-announcements";
import { ASK_CATEGORIES } from "@/modules/asks/contract";
import type { BoardCompany, BoardJob } from "@/modules/job-board/contract";
import { buildCandidateQuery, draftHiringAsk, readRole } from "@/modules/job-board/rules-candidates";
import { DEMO_JOB_SOURCES } from "@/platform/demo/jobs";
import { DEMO_COMMUNITY, DEMO_COMMUNITY_ROLES, DEMO_OUTSIDERS, DEMO_PEOPLE, toDemoBookingUrl, type DemoPerson } from "@/platform/demo/people";
import { toAskDraftHref } from "@/platform/modules/manifest";
import { isExpertRole, readCommunityRole } from "@/modules/members/contract-community-roles";
import { toPictureSlug } from "@/platform/demo/pictures";
import { LIBRARY_JOBS, LIBRARY_KINDS, LIBRARY_VISIBILITIES, type LibraryJob, type LibraryKind } from "@/modules/library/contract";
import type { Leaderboard, LibraryCard, LibraryMember } from "@/modules/library/reads";
import { ROOM_ACCESS, ROOM_ROLES, ROOM_STATUSES, toRoomHref, type RoomCard, type RoomFace, type RoomJoin, type RoomRole } from "@/modules/voice/contract";
import { NOTIFICATION_KINDS, QUIET_TIME_PRESETS, type AlertPreferences, type NotificationKind } from "@/platform/notifications/contract";

// The tour's made-up community: the demo's own people (src/platform/demo/people.ts), their generated portraits and
// drawn logos. Nothing here is a real person or company. The build copies only the pictures these lines name.

export const COMMUNITY_NAME = DEMO_COMMUNITY.name;

// Pictures sit beside the tour's script on the landing page (site/tour/faces, site/tour/logos).
const PICTURES = "tour";

export function faceUrl(name: string) {
  return `${PICTURES}/faces/${toPictureSlug(name)}.webp`;
}

export function logoUrl(company: string) {
  return `${PICTURES}/logos/${toPictureSlug(company)}.svg`;
}

function person(key: string): DemoPerson {
  const found = DEMO_PEOPLE.find((candidate) => candidate.key === key);
  if (!found) throw new Error(`No demo person ${key}`);
  return found;
}

function outsider(name: string) {
  const found = DEMO_OUTSIDERS.find((candidate) => candidate.name === name);
  if (!found) throw new Error(`No demo outsider ${name}`);
  return found;
}

// A stable made-up id per demo person (the app keys avatars' tints by id).
function idOf(key: string) {
  return `demo-${key}`;
}

// Sam Lee (Tallyhealth) is the founder the tour follows; Maya Ortiz is the fund's admin.
export const FOUNDER = person("sam.lee");
export const ADMIN = person("maya.ortiz");

export const FOUNDER_VIEWER = { id: idOf(FOUNDER.key), name: FOUNDER.name, imageUrl: faceUrl(FOUNDER.name) };

export function toShellMember(who: DemoPerson) {
  return { id: idOf(who.key), name: who.name, email: `${who.key}@example.com`, image: faceUrl(who.name), isAdmin: Boolean(who.isAdmin) };
}

// ---------- Search ----------

export const SEARCH_QUERY = "Head of procurement at a US hospital";

function pathThrough(key: string, warmth: string) {
  const member = person(key);
  return { memberId: idOf(key), name: member.name, about: `${member.title}, ${member.company}`, imageUrl: faceUrl(member.name), linkedinSlug: null, warmth };
}

function outsidePerson(name: string, paths: ReturnType<typeof pathThrough>[]) {
  const found = outsider(name);
  return {
    fullName: found.name,
    headline: `${found.title} at ${found.company}`,
    linkedinSlug: found.slug,
    isMember: false,
    memberId: null,
    imageUrl: faceUrl(found.name),
    title: found.title,
    company: found.company,
    companyLogoUrl: logoUrl(found.company),
    city: found.location,
    direct: null,
    paths,
  };
}

export const SEARCH_RESULT: NetworkSearchResult = {
  query: SEARCH_QUERY,
  scope: "network",
  people: [
    outsidePerson("Dana Whitfield", [pathThrough("oliver.grant", "Close"), pathThrough("zara.ahmed", "Knows")]),
    outsidePerson("Alex Kim", [pathThrough("marcus.webb", "Knows")]),
    outsidePerson("Nina Patel", [pathThrough("julia.weber", "Met")]),
  ],
  members: [],
  discardedOffNetworkResults: false,
  dailyLookupsLeft: 18,
  includesOwnNetwork: true,
  isCached: false,
  isProfilesOnly: false,
  pathsUnavailable: false,
};

export const SHARING_MEMBER_COUNT = DEMO_PEOPLE.filter(({ sharesNetwork }) => sharesNetwork).length;

// ---------- The intro ask ----------

export const INTRO_TARGET = outsider("Dana Whitfield");
export const INTRO_CONNECTOR = person("oliver.grant");
export const INTRO_NOTE = `Hi Oliver, could you introduce me to Dana? Tallyhealth cuts supply waste in US hospitals, and Lakeshore Health is the buyer we want to learn from. Happy to send a short note you can forward.`;
// The address "Ask Oliver for an intro" opens (the app's toAskHref in search-results.tsx).
export const INTRO_ASK_PAGE = `/search/ask?${new URLSearchParams({ target: INTRO_TARGET.slug, via: idOf(INTRO_CONNECTOR.key), back: `/search?${new URLSearchParams({ q: SEARCH_QUERY, scope: "network" }).toString()}` }).toString()}`;

// ---------- Asks & updates ----------

export const ASK_BODY = "Intro to a CFO at a Dutch hospital group";

function askMember(key: string): AskMember {
  const member = person(key);
  return { id: idOf(key), name: member.name, title: member.title, company: member.company, avatarUrl: faceUrl(member.name), companyLogoUrl: logoUrl(member.company) };
}

function post(id: string, key: string, body: string, hoursAgo: number, extra: Partial<BoardPost> = {}): BoardPost {
  return {
    id,
    body,
    kind: "ask",
    state: "open",
    isPinned: false,
    isMine: false,
    author: askMember(key),
    createdAt: new Date(TOUR_NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
    who: "",
    targetName: null,
    targetText: null,
    targetCompany: null,
    helperCount: 0,
    pathHelperCount: 0,
    helperFaces: [],
    viewerWhyYou: null,
    viewerHasHelped: false,
    answerCount: 0,
    ...extra,
  };
}

// The tour's clock, so every "2 days ago" reads the same on every visit.
export const TOUR_NOW = new Date("2026-11-18T10:00:00.000Z");

export const ASK_POSTS: BoardPost[] = [
  post("00000000-0000-4000-8000-0000000a0001", "noah.berg", "Angel investors who know the Nordics", 20, { helperCount: 3, pathHelperCount: 2, helperFaces: [askMember("julia.weber"), askMember("ada.okafor")], answerCount: 2 }),
  post("00000000-0000-4000-8000-0000000a0002", "ravi.menon", "A US-based head of sales for a developer tools company", 46, { helperCount: 2, pathHelperCount: 1, helperFaces: [askMember("priya.shah")], answerCount: 1 }),
  post("00000000-0000-4000-8000-0000000a0003", "kwame.asante", "Freight forwarders in Rotterdam", 70, { helperCount: 1, pathHelperCount: 1, helperFaces: [askMember("marcus.webb")], answerCount: 1 }),
];

export const ASK_COUNTS: AskTabCounts = { open: 3, "for-you": 1, yours: 0, answered: 14 };

export const ASK_ALLOWANCE: AskAllowance = { cap: 5, used: 1, left: 4, backAt: null };

// ---------- Directory ----------

function directoryMember(member: DemoPerson): DirectoryMember {
  return {
    id: idOf(member.key),
    name: member.name,
    title: member.title,
    company: member.company,
    location: member.location,
    bio: member.bio,
    canHelpWith: member.canHelpWith,
    freshAt: new Date(TOUR_NOW.getTime() - member.joinedDaysAgo * 86_400_000).toISOString(),
    stage: member.stage,
    sector: member.sector,
    cohort: member.cohort,
    avatarUrl: faceUrl(member.name),
    companyLogoUrl: logoUrl(member.company),
    hiringJobCount: member.key === "ravi.menon" ? 2 : member.key === "amara.diallo" ? 1 : 0,
    tags: [...member.tags],
    communityRole: readCommunityRole(DEMO_COMMUNITY_ROLES[member.key]?.role ?? "") ?? "founder",
    bookingUrl: readBookingUrl(member.key),
  };
}

const FOUNDERS = DEMO_PEOPLE.filter(({ stage }) => stage !== "Fund");

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((first, second) => first.localeCompare(second));
}

export const DIRECTORY_SECTOR = "Fintech";

// The link Sam Lee may see: the member's own, unless they keep it for people they were introduced to (Ines Costa).
function readBookingUrl(key: string) {
  const booking = DEMO_COMMUNITY_ROLES[key];
  return booking?.hasBookingLink && !booking.isIntroducedOnly ? toDemoBookingUrl(key) : null;
}

// "Experts and mentors" (?view=experts): the mentor the tour books first, then the members with a link, then the rest.
export const EXPERTS_VIEW_HREF = "/directory?view=experts";
export const BOOKED_MEMBER = person("grace.kim");

function readExperts() {
  const rank = (member: DemoPerson) => (member.key === BOOKED_MEMBER.key ? 0 : readBookingUrl(member.key) ? 1 : 2);
  return DEMO_PEOPLE.filter(({ key }) => isExpertRole(DEMO_COMMUNITY_ROLES[key]?.role)).sort((first, second) => rank(first) - rank(second));
}

export function readDirectory(sector: string, isExpertsView = false): Directory {
  const listed = isExpertsView ? readExperts() : FOUNDERS.filter((member) => !sector || member.sector === sector);
  const members = listed.map(directoryMember);
  return {
    members,
    matchCount: members.length,
    memberCount: FOUNDERS.length,
    page: 1,
    pageCount: 1,
    popularTags: [],
    filterOptions: {
      stage: uniqueSorted(FOUNDERS.map(({ stage }) => stage)),
      sector: uniqueSorted(FOUNDERS.map(({ sector }) => sector)),
      city: uniqueSorted(FOUNDERS.map(({ location }) => location)),
      cohort: uniqueSorted(FOUNDERS.map(({ cohort }) => cohort)),
    },
    isHiringShown: true,
  };
}

// ---------- The admin home ----------

export const CONSOLE_HOME: ConsoleHome = {
  isIntrosOn: true,
  ledger: {
    asked: 148,
    connectorYes: 112,
    made: 91,
    declinedByConnector: 14,
    declinedByTarget: 9,
    declined: 23,
    noAnswer: 6,
    openWithConnector: 11,
    openWithTarget: 6,
    open: 17,
    answered: 64,
    helpful: 57,
  },
  latest: [],
  members: { joined: FOUNDERS.length + 2, invited: 2, withProfile: FOUNDERS.length, waiting: [] },
  network: { connected: 15, sharing: 13, noAsks: 1, syncing: 1 },
  lookups: { isConfigured: true, used: 1240, cap: 7500, usedPercent: 17, pace: 2100, search: 610, paths: 540, fillIn: 90, dailyLimit: 20 },
  asks: { posted: 41, open: 3, answered: 29, medianHours: 5, withHelpers: 37, helped: 34, intros: 12, introsMade: 8, updates: 9 },
  mail: { isSet: true, isDemo: false, address: "community@example.com", domain: "example.com", sent: 20, failed: 0 },
  // "Book a call" clicks (made up), for the console Home's Calls requested sheet.
  calls: { total: 14, lastThirtyDays: 6 },
};

// ---------- Jobs and Find candidates ----------

// The demo's job board (src/platform/demo/jobs.ts): each job at its founder's company, linked by that founder.
export const BOARD_JOBS: BoardJob[] = DEMO_JOB_SOURCES.flatMap((source, sourceIndex) => {
  const founder = person(source.founder);
  return source.jobs.map((job, index) => ({
    id: `00000000-0000-4000-8000-0000000b${String(sourceIndex).padStart(2, "0")}${String(index).padStart(2, "0")}`,
    title: job.title,
    location: job.location,
    department: job.department,
    url: `https://jobs.example.com/${source.slug}/${index + 1}`,
    postedAt: new Date(TOUR_NOW.getTime() - job.postedDaysAgo * 86_400_000).toISOString(),
    company: founder.company,
    companySlug: source.slug,
    companyLogoUrl: logoUrl(founder.company),
    memberId: idOf(founder.key),
    memberName: founder.name,
  }));
}).sort((first, second) => (second.postedAt ?? "").localeCompare(first.postedAt ?? ""));

export const BOARD_COMPANIES: BoardCompany[] = DEMO_JOB_SOURCES.map((source) => ({ slug: source.slug, name: person(source.founder).company, jobCount: source.jobs.length }));

function findCandidateJob() {
  const found = BOARD_JOBS.find(({ companySlug, department }) => companySlug === "tallyhealth" && department === "Sales");
  if (!found) throw new Error("No Tallyhealth sales job in the demo's jobs");
  return found;
}

// Sam Lee's founding account executive in Boston: the job the tour finds candidates for.
export const CANDIDATE_JOB = findCandidateJob();
export const CANDIDATE_ROLE = readRole(CANDIDATE_JOB.title);
export const CANDIDATE_QUERY = buildCandidateQuery(CANDIDATE_JOB) ?? CANDIDATE_JOB.title;
// The address "Find candidates" lands on: the app's first visit redirects to add the job's search, so the tour's link
// goes there at once.
export function toCandidatesHref(jobId: string) {
  return `/search/candidates?${new URLSearchParams({ job: jobId, q: CANDIDATE_QUERY, scope: "network" }).toString()}`;
}
export const CANDIDATES_PAGE = toCandidatesHref(CANDIDATE_JOB.id);
export const HIRING_ASK_HREF = toAskDraftHref(draftHiringAsk(CANDIDATE_JOB), { category: ASK_CATEGORIES.hire });

// Made-up account executives in Boston (portraits in public/demo/faces that no other demo person uses).
function candidate(name: string, title: string, company: string, paths: ReturnType<typeof pathThrough>[]) {
  return {
    fullName: name,
    headline: `${title} at ${company}`,
    linkedinSlug: `${toPictureSlug(name)}-demo`,
    isMember: false,
    memberId: null,
    imageUrl: faceUrl(name),
    title,
    company,
    companyLogoUrl: logoUrl(company),
    city: "Boston",
    direct: null,
    paths,
  };
}

export const CANDIDATE_RESULT: NetworkSearchResult = {
  query: CANDIDATE_QUERY,
  scope: "network",
  people: [
    candidate("Grace Ito", "Senior Account Executive", "Halcyon Health", [pathThrough("ada.okafor", "Close")]),
    candidate("Leo Martins", "Account Executive, Hospitals", "Countwise", [pathThrough("priya.shah", "Knows"), pathThrough("ravi.menon", "Met")]),
    candidate("Jonas Weber", "Head of Sales, East Coast", "Stackwise", [pathThrough("marcus.webb", "Knows")]),
  ],
  members: [],
  discardedOffNetworkResults: false,
  dailyLookupsLeft: 17,
  includesOwnNetwork: true,
  isCached: false,
  isProfilesOnly: false,
  pathsUnavailable: false,
};

// ---------- Announcements ----------

export const ANNOUNCEMENT_SUBJECT = "Demo day is on 4 December";
export const ANNOUNCEMENT_BODY = "Hi {first name},\n\nDemo day is on 4 December in Amsterdam. Every founder gets five minutes on stage. Save the date.";

// Everyone the page lists, the admin first (the preview starts on them). One member turned announcements off.
export const ANNOUNCEMENT_MEMBERS: ComposerMember[] = [ADMIN, ...DEMO_PEOPLE.filter(({ key }) => key !== ADMIN.key)].map((member) => ({
  id: idOf(member.key),
  name: member.name,
  company: member.company,
  cohort: member.cohort,
  communityRole: readCommunityRole(DEMO_COMMUNITY_ROLES[member.key]?.role ?? "") ?? "founder",
  isWanted: member.key !== "kwame.asante",
}));

export const ANNOUNCEMENT_COHORTS: ComposerCohort[] = uniqueSorted(ANNOUNCEMENT_MEMBERS.map(({ cohort }) => cohort ?? "").filter(Boolean)).map((name) => {
  const inCohort = ANNOUNCEMENT_MEMBERS.filter(({ cohort }) => cohort === name);
  return { name, memberCount: inCohort.length, wantedCount: inCohort.filter(({ isWanted }) => isWanted).length };
});

export const SENT_ANNOUNCEMENTS: SentAnnouncement[] = [
  {
    id: "00000000-0000-4000-8000-0000000c0001",
    subject: "Office hours with the partners, every Friday",
    audience: ANNOUNCEMENT_AUDIENCES.everyone,
    cohort: null,
    queuedCount: ANNOUNCEMENT_MEMBERS.filter(({ isWanted }) => isWanted).length,
    isPosted: true,
    sentByName: ADMIN.name,
    sentAt: new Date(TOUR_NOW.getTime() - 9 * 86_400_000),
  },
];

// ---------- The AI library ----------

function libraryMember(key: string): LibraryMember {
  const member = person(key);
  return { id: idOf(key), name: member.name, title: member.title, company: member.company, avatarUrl: faceUrl(member.name), companyLogoUrl: logoUrl(member.company) };
}

function libraryItem(id: number, key: string, title: string, pitch: string, kind: LibraryKind, job: LibraryJob, upvotes: number, extra: Partial<LibraryCard> = {}): LibraryCard {
  return {
    id: `00000000-0000-4000-8000-0000000d${String(id).padStart(4, "0")}`,
    title,
    pitch,
    kind,
    job,
    visibility: LIBRARY_VISIBILITIES.portfolio,
    author: libraryMember(key),
    upvotes,
    isUpvoted: false,
    isFeatured: false,
    isMine: key === FOUNDER.key,
    updatedAt: new Date(TOUR_NOW.getTime() - id * 2 * 86_400_000).toISOString(),
    ...extra,
  };
}

// Made-up items by the demo people, like the demo's own library (src/shell/demo-library.ts). The first is featured.
export const LIBRARY_ITEMS: LibraryCard[] = [
  libraryItem(1, "priya.shah", "Cold email reviewer", "Scores a cold email out of 10 and rewrites the opening line.", LIBRARY_KINDS.prompt, LIBRARY_JOBS.sales, 7, { isFeatured: true }),
  libraryItem(2, "ada.okafor", "CRM tool connection for Claude", "Lets an AI assistant look up deals and contacts in your CRM, read-only.", LIBRARY_KINDS.toolConnection, LIBRARY_JOBS.sales, 4),
  libraryItem(3, "sam.lee", "Support inbox triage agent", "Tags every new ticket by urgency and drafts a first reply for a person to check.", LIBRARY_KINDS.agent, LIBRARY_JOBS.supportOps, 4),
  libraryItem(4, "marcus.webb", "Interview scorecard writer", "Turns a job description into a scorecard with questions and what good looks like.", LIBRARY_KINDS.skill, LIBRARY_JOBS.hiring, 3),
  libraryItem(5, "elena.rossi", "Monthly investor update drafter", "Drafts the monthly update from your metrics sheet and three bullet points.", LIBRARY_KINDS.prompt, LIBRARY_JOBS.fundraising, 3),
  libraryItem(6, "hana.sato", "Product launch playbook with AI", "Our two-week launch plan, with the prompts we used at each step.", LIBRARY_KINDS.playbook, LIBRARY_JOBS.marketing, 4),
];

const BOARD_PEOPLE: readonly (readonly [string, number])[] = [
  ["priya.shah", 12],
  ["ada.okafor", 9],
  ["hana.sato", 8],
  ["sam.lee", 6],
  ["marcus.webb", 5],
  ["elena.rossi", 4],
  ["zara.ahmed", 3],
];

export const LIBRARY_BOARD: Leaderboard = {
  people: BOARD_PEOPLE.map(([key, upvotes]) => ({ member: libraryMember(key), upvotes })),
  companies: BOARD_PEOPLE.map(([key, upvotes]) => {
    const { company } = person(key);
    return { company, logoUrl: logoUrl(company), upvotes, people: 1 };
  }),
};

// ---------- Voice rooms ----------

function roomFace(key: string, role: RoomRole): RoomFace {
  const member = person(key);
  return { id: idOf(key), name: member.name, faceUrl: faceUrl(member.name), role };
}

export const ROOM_ID = "00000000-0000-4000-8000-0000000e0001";
export const ROOM_HREF = toRoomHref(ROOM_ID);
export const ROOM_TITLE = "Selling to hospitals: what we learned";
export const ROOM_VIEWER_ID = idOf(FOUNDER.key);

export type TourRoomPerson = RoomFace & { isSpeaking: boolean; isMuted: boolean; isHandRaised: boolean };

function inRoom(key: string, role: RoomRole, extra: Partial<TourRoomPerson> = {}): TourRoomPerson {
  return { ...roomFace(key, role), isSpeaking: false, isMuted: role === ROOM_ROLES.listener, isHandRaised: false, ...extra };
}

// Everyone in the live room: the stage, then the audience. Sam Lee, the founder the tour follows, is listening.
export const ROOM_PEOPLE: readonly TourRoomPerson[] = [
  inRoom("oliver.grant", ROOM_ROLES.host, { isSpeaking: true }),
  inRoom("priya.shah", ROOM_ROLES.cohost),
  inRoom("grace.kim", ROOM_ROLES.speaker, { isMuted: true }),
  inRoom("sam.lee", ROOM_ROLES.listener),
  ...["ada.okafor", "marcus.webb", "elena.rossi", "tomas.novak", "hana.sato", "diego.alvarez", "noah.berg", "zara.ahmed"].map((key) =>
    inRoom(key, ROOM_ROLES.listener, { isHandRaised: key === "marcus.webb" }),
  ),
];

// The pictures the live room shows: it fills in after it "connects", so the build's server render never sees them.
export const ROOM_PICTURES = ROOM_PEOPLE.map(({ faceUrl: url }) => url).filter((url): url is string => Boolean(url));

function roomCard(id: string, title: string, stage: RoomFace[], extra: Partial<RoomCard> = {}): RoomCard {
  const host = stage[0]!;
  return {
    id,
    title,
    access: ROOM_ACCESS.open,
    status: ROOM_STATUSES.live,
    scheduledFor: null,
    startedAt: new Date(TOUR_NOW.getTime() - 25 * 60_000).toISOString(),
    isBroadcast: false,
    hostId: host.id,
    hostName: host.name,
    stage,
    listenerCount: 0,
    hasReminder: false,
    isInvited: false,
    ...extra,
  };
}

const ROOM_STAGE: RoomFace[] = ROOM_PEOPLE.filter(({ role }) => role !== ROOM_ROLES.listener).map(({ id, name, faceUrl: url, role }) => ({ id, name, faceUrl: url, role }));

// What the Rooms page reads (readRoomsPage): two live rooms, one coming up, three "I'm available" left today.
export const ROOMS_PAGE: { live: RoomCard[]; scheduled: RoomCard[]; broadcastsLeft: number; isConfigured: boolean } = {
  live: [
    roomCard(ROOM_ID, ROOM_TITLE, ROOM_STAGE, { listenerCount: ROOM_PEOPLE.length }),
    roomCard("00000000-0000-4000-8000-0000000e0002", "Elena is available to talk", [roomFace("elena.rossi", ROOM_ROLES.host)], { isBroadcast: true, listenerCount: 2 }),
  ],
  scheduled: [
    roomCard("00000000-0000-4000-8000-0000000e0003", "Pricing your first enterprise deal", [roomFace("noah.berg", ROOM_ROLES.host), roomFace("zara.ahmed", ROOM_ROLES.cohost)], {
      status: ROOM_STATUSES.scheduled,
      scheduledFor: "2026-11-20T16:00:00.000Z",
      startedAt: null,
      hasReminder: true,
    }),
  ],
  broadcastsLeft: 3,
  isConfigured: true,
};

// What the tour's stand-in for the join request answers (the token goes to the stand-in LiveKit, never a server).
export const ROOM_JOIN: RoomJoin = { serverUrl: "wss://rooms.example.com", token: "tour", roomName: ROOM_ID, role: ROOM_ROLES.listener, identity: ROOM_VIEWER_ID };

// ---------- Alerts ----------

export const ALERT_KINDS: readonly NotificationKind[] = [
  NOTIFICATION_KINDS.intro,
  NOTIFICATION_KINDS.answer,
  NOTIFICATION_KINDS.message,
  NOTIFICATION_KINDS.voiceBroadcast,
  NOTIFICATION_KINDS.voiceRoom,
];

// Sam keeps every alert; the step adds Working hours as a quiet time.
export function readAlertPreferences(isQuietOn: boolean): AlertPreferences {
  const [workingHours] = QUIET_TIME_PRESETS;
  return {
    isOn: true,
    offKinds: [],
    quietTimes: isQuietOn ? [{ ...workingHours.quietTime, days: [...workingHours.quietTime.days] }] : [],
    timeZone: "America/New_York",
    letDirectThrough: true,
  };
}

export const ALERT_MUTED = [{ id: idOf("noah.berg"), name: person("noah.berg").name }];
export const ALERT_MEMBERS = DEMO_PEOPLE.filter(({ key }) => key !== FOUNDER.key).map(({ key, name }) => ({ id: idOf(key), name }));
