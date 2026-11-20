import { ANNOUNCEMENT_BODY, ANNOUNCEMENT_SUBJECT, ASK_BODY, CANDIDATES_PAGE, DIRECTORY_SECTOR, EXPERTS_VIEW_HREF, INTRO_ASK_PAGE, INTRO_NOTE, ROOM_HREF, SEARCH_QUERY } from "./data";
import type { Player } from "./player";

// The tour's steps, in order. Each is one tab on the landing page. How to add one: tour/AGENTS.md and
// .ai/features/landing-tour/NOTES.md.

export type TourHands = Player & {
  // Open another address in the tour's app, as a link would.
  go: (href: string) => Promise<void>;
};

export type TourStep = {
  id: string;
  // The tab's words.
  label: string;
  // One line under the screen: what the visitor is looking at.
  caption: string;
  // The address the step opens on (a page listed in screens.tsx).
  start: string;
  // The address of the step's still: shown without motion, and for step 1 without JavaScript.
  still: string;
  // Puts the still in its end state at once (filled fields), with no pointer. Optional.
  settle?: (hands: TourHands) => Promise<void>;
  // The scripted run: point, type, click. It ends on the still.
  play: (hands: TourHands) => Promise<void>;
};

const RESULTS = `/search?q=${encodeURIComponent(SEARCH_QUERY)}&scope=network`;
const ASK_BUTTON = ".fh-result .fh-btn-row a";

export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "search",
    label: "Search",
    caption: "Type who you need. See the faces in reach and the member who can introduce you.",
    start: "/search",
    still: RESULTS,
    async play(hands) {
      await hands.type("#q", SEARCH_QUERY);
      await hands.wait(250);
      await hands.submit("#q");
      await hands.wait(900);
      await hands.point(".fh-result .fh-pathtext");
      await hands.wait(1200);
      await hands.point(ASK_BUTTON);
      await hands.wait(1600);
    },
  },
  {
    id: "intro",
    label: "Ask for an intro",
    caption: "Ask one member for the intro. They say yes first, then the person you want to meet.",
    start: RESULTS,
    still: INTRO_ASK_PAGE,
    async settle(hands) {
      await hands.fill("#a-note", INTRO_NOTE);
    },
    async play(hands) {
      await hands.wait(400);
      await hands.click(ASK_BUTTON);
      await hands.wait(700);
      await hands.type("#a-note", INTRO_NOTE);
      await hands.wait(400);
      await hands.tap(".fh-send-row button");
      await hands.wait(1800);
    },
  },
  {
    id: "community",
    label: "Ask everyone",
    caption: "Or ask everyone. The members most likely to help hear about it, and it goes in the weekly email.",
    start: "/asks",
    still: "/asks",
    async settle(hands) {
      await hands.fill("#p-body", ASK_BODY);
    },
    async play(hands) {
      await hands.wait(400);
      await hands.type("#p-body", ASK_BODY);
      await hands.wait(400);
      await hands.tap("#compose .fh-oneline button");
      await hands.wait(600);
      await hands.point(".fh-posts article, .fh-posts > *");
      await hands.wait(1800);
    },
  },
  {
    id: "directory",
    label: "Directory",
    caption: "Every founder in one place. Filter by stage, sector, city and cohort.",
    start: "/directory",
    still: `/directory?sector=${DIRECTORY_SECTOR}`,
    async play(hands) {
      await hands.wait(500);
      await hands.point(".fh-filters .fh-filt:nth-child(2) select");
      await hands.wait(200);
      await hands.go(`/directory?sector=${DIRECTORY_SECTOR}`);
      await hands.wait(900);
      await hands.point(".fh-cards .fh-mcard");
      await hands.wait(2000);
    },
  },
  {
    id: "book-call",
    label: "Book a call",
    caption: "Mentors, experts and advisors in one view. Book a call on their own calendar, in one click.",
    start: "/directory",
    still: EXPERTS_VIEW_HREF,
    async play(hands) {
      await hands.wait(500);
      // The switch rewrites the window's address in the app, so the tour presses it and moves its own address.
      await hands.tap(".fh-seg button[aria-pressed='false']");
      await hands.go(EXPERTS_VIEW_HREF);
      await hands.wait(900);
      await hands.point("[data-testid='expert-card'] .fh-who");
      await hands.wait(1200);
      // A real click opens the booking page in a new tab and counts the call: the tour only presses.
      await hands.tap("[data-testid='expert-card'] [data-testid='book-call']");
      await hands.wait(1800);
    },
  },
  {
    id: "candidates",
    label: "Find candidates",
    caption: "Hiring? Find candidates for a job in the network around you, or ask the community for them.",
    start: "/jobs",
    still: CANDIDATES_PAGE,
    async play(hands) {
      await hands.wait(500);
      await hands.click("a[href^='/search/candidates']");
      await hands.wait(900);
      await hands.point(".fh-result .fh-pathtext");
      await hands.wait(1400);
      await hands.point("[data-slot='hiring-request'] a");
      await hands.wait(1800);
    },
  },
  {
    id: "library",
    label: "AI library",
    caption: "Founders share the AI skills, agents and prompts that work for them. Upvote what helped; Top shows what others use most.",
    start: "/library",
    still: "/library",
    async play(hands) {
      await hands.wait(500);
      await hands.point("[data-testid='library-card'] .fh-lib-title");
      await hands.wait(1100);
      // An upvote is a request: the tour only presses.
      await hands.tap("[data-testid='library-card']:nth-child(2) .fh-lib-vote button");
      await hands.wait(700);
      await hands.point("main .fh-chips a[href$='sort=top']");
      await hands.wait(1800);
    },
  },
  {
    id: "rooms",
    label: "Voice rooms",
    caption: "Live voice rooms, like Clubhouse. Say you're available to talk, or drop into a room and raise a hand. Never recorded.",
    start: "/rooms",
    still: ROOM_HREF,
    async settle(hands) {
      // The people arrive once the room "connects"; then the stage goes to the top, clear of the room's control bar.
      await hands.find("[data-testid='room-person']");
      await hands.show(".vr-section-label", "[data-testid='audience']");
    },
    async play(hands) {
      await hands.wait(500);
      // "I'm available to talk" opens a room and alerts the community: the tour only presses.
      await hands.tap("main .fh-btn-row button");
      await hands.wait(1200);
      await hands.click("[data-testid='live-room']");
      await hands.wait(1000);
      await hands.point("[data-testid='stage'] [data-role='host']");
      await hands.wait(1600);
      // A reaction stays on the page (the tour's LiveKit sends nothing).
      await hands.click("button[aria-label='Reactions']");
      await hands.wait(300);
      await hands.click("button[aria-label='React 👏']");
      await hands.wait(1000);
      await hands.tap("[data-testid='hand']");
      await hands.wait(1800);
    },
  },
  {
    id: "alerts",
    label: "Alerts",
    caption: "Alerts on your phone and computer. Pause them for an hour, or keep working hours quiet.",
    start: "/me/alerts",
    still: "/me/alerts?quiet=1",
    async settle(hands) {
      await hands.show("[data-testid='pause-card']", "[data-testid='quiet-times']");
    },
    async play(hands) {
      await hands.wait(500);
      await hands.point("[data-testid='pause-card'] button");
      await hands.wait(1100);
      // A preset saves at once; the tour's requests never leave the page, so it only shows the new quiet time.
      await hands.click("[role='group'][aria-label='Add a quiet time'] button");
      await hands.wait(900);
      await hands.point("#let-direct-through");
      await hands.wait(1800);
    },
  },
  {
    id: "announcement",
    label: "Announce",
    caption: "The team writes once. Every member gets their own email, and it is pinned in the feed.",
    start: "/admin/announcements",
    still: "/admin/announcements",
    async settle(hands) {
      await hands.fill("#a-subject", ANNOUNCEMENT_SUBJECT);
      await hands.fill("#a-body", ANNOUNCEMENT_BODY);
    },
    async play(hands) {
      await hands.wait(400);
      await hands.type("#a-subject", ANNOUNCEMENT_SUBJECT);
      await hands.wait(300);
      await hands.type("#a-body", ANNOUNCEMENT_BODY);
      await hands.wait(400);
      // The preview sits folded under "Preview and test": open it, then point at the email.
      await hands.click("details[aria-label='Preview'] > summary");
      await hands.wait(300);
      await hands.point(".fh-mail");
      await hands.wait(1600);
      await hands.tap("form[aria-label='New announcement'] button[type='submit']");
      await hands.wait(1800);
    },
  },
  {
    id: "admin",
    label: "This week",
    caption: "The fund's home: this week's active founders, asks, intros and room joins, and what needs you.",
    start: "/admin",
    still: "/admin",
    async play(hands) {
      await hands.wait(600);
      await hands.point("[data-testid='admin-home-this-week']");
      await hands.wait(1800);
      await hands.point("[data-testid='admin-home-needs-you']");
      await hands.wait(2000);
    },
  },
];
