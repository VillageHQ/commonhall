import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));

import { TODAY_COMPOSE_PAGE, TodayPage, describeRoomPeople } from "./today-list";
import type { TodayItems } from "./today";

const NOTHING: TodayItems = {
  helpableAsks: [],
  introsToAnswer: [],
  introsToFinish: [],
  introsForYou: [],
  profileLines: [],
  ownAsks: [],
  ownPosts: [],
  introsInMotion: [],
  newMembers: [],
  newMemberCount: 0,
};

const ROOM = { id: "3f0c2b1e-0000-4000-8000-000000000001", title: "Fundraising office hours", hostName: "Maya Ito", faces: [{ name: "Maya Ito", image: null }, { name: "Leo Park", image: null }], count: 4 };

const FACT = { field: "location", label: "City", value: "Lisbon", filledAt: new Date().toISOString() } as unknown as TodayItems["profileLines"][number];

function renderToday(overrides: Partial<Parameters<typeof TodayPage>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(TodayPage, {
      today: NOTHING,
      memberName: "Sam Lee",
      dateLabel: "Friday 20 Nov",
      liveRoom: null,
      replyDay: null,
      showFacts: true,
      isAsksOn: true,
      nextSteps: [],
      lookupQuestion: null,
      flash: null,
      moreLinks: [],
      now: new Date(),
      ...overrides,
    }),
  );
}

function answeredAsk(index: number) {
  return { id: `ask-${index}`, body: `Ask number ${index}`, answerCount: 1, hasNewAnswers: true } as unknown as TodayItems["ownPosts"][number];
}

describe("Today (round 6)", () => {
  it("puts what waits above the live room and the one-time cards (round 7)", () => {
    const html = renderToday({
      today: { ...NOTHING, ownPosts: [answeredAsk(1)] },
      liveRoom: ROOM,
      installCard: createElement("section", { "data-testid": "install-card" }),
      lookupQuestion: createElement("section", { id: "lookup-question-title" }),
    });

    const waiting = html.indexOf("Waiting on you");
    expect(waiting).toBeGreaterThan(-1);
    expect(waiting).toBeLessThan(html.indexOf("Live now"));
    expect(waiting).toBeLessThan(html.indexOf("install-card"));
    expect(waiting).toBeLessThan(html.indexOf("lookup-question-title"));
  });

  it("counts in its heading exactly the things it shows (round 7)", () => {
    const html = renderToday({ today: { ...NOTHING, ownPosts: [1, 2, 3, 4, 5].map(answeredAsk) } });

    expect(html).toContain("Sam, 3 things wait for you");
    expect(html.match(/Your ask · /g)).toHaveLength(3);
  });


  it("opens with a full-width Live now card and a Join link while a room is live", () => {
    const html = renderToday({ liveRoom: ROOM });

    expect(html.indexOf("Live now")).toBeGreaterThan(-1);
    expect(html).toContain(`href="/rooms/${ROOM.id}"`);
    expect(html).toContain("Join");
    expect(html).toContain("Maya + 3");
  });

  it("shows no live strip, not even a placeholder, when nothing is live", () => {
    expect(renderToday()).not.toContain("Live now");
  });

  it("asks “Is this right?” only while the member is new", () => {
    const today = { ...NOTHING, profileLines: [FACT] };

    expect(renderToday({ today, showFacts: true })).toContain("Is this right?");
    expect(renderToday({ today, showFacts: false })).not.toContain("Is this right?");
  });

  it("opens the Asks box from Post an ask, and hides the button while Asks is off", () => {
    expect(renderToday()).toContain(`href="${TODAY_COMPOSE_PAGE.replace("&", "&amp;")}"`);
    expect(renderToday({ isAsksOn: false })).not.toContain("Post an ask");
  });

  it("names the first face and how many more are in", () => {
    expect(describeRoomPeople({ faces: [{ name: "Maya Ito", image: null }], count: 1 })).toBe("Maya is in");
    expect(describeRoomPeople({ faces: [], count: 0 })).toBe("Nobody in yet");
  });
});
