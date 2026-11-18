import { ASK_BODY, DIRECTORY_SECTOR, INTRO_ASK_PAGE, INTRO_NOTE, SEARCH_QUERY } from "./data";
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
    id: "admin",
    label: "Intros, counted",
    caption: "The fund's home: every intro asked, made and declined, and how members found them.",
    start: "/admin",
    still: "/admin",
    async play(hands) {
      await hands.wait(600);
      await hands.point("[data-testid='admin-home-intros']");
      await hands.wait(1400);
      await hands.point("#h-ledger");
      await hands.wait(2200);
    },
  },
];
