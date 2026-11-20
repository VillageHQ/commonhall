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

describe("Today (round 6)", () => {
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
