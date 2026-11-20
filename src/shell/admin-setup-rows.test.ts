import { describe, expect, it } from "vitest";

import { readSetupRows, SETUP_ROW_PLACES, SETUP_ROW_STATES, type SetupFacts } from "./admin-setup-rows.ts";

const FRESH_INSTALL: SetupFacts = {
  isMailOn: false,
  hasSendingDomain: false,
  isNetworkOn: true,
  hasVillageKeys: false,
  isChatOn: true,
  isChatPosting: false,
  isPerksOn: true,
  isPerksShown: false,
  isVoiceOn: false,
  isVoiceReady: false,
  isJobBoardOn: true,
  featuresOn: 8,
  openReports: 0,
};

function readStates(facts: SetupFacts) {
  return readSetupRows(facts).map(({ title, state }) => [title, state.kind === SETUP_ROW_STATES.done ? "Set up" : state.kind === SETUP_ROW_STATES.todo ? "Not yet" : state.text]);
}

describe("the Set up page's rows", () => {
  it("keeps Mail and Features in view and folds every page for an engineer under Advanced", () => {
    const rows = readSetupRows(FRESH_INSTALL);
    expect(rows.filter(({ place }) => place === SETUP_ROW_PLACES.essential).map(({ title }) => title)).toEqual(["Mail", "Features"]);
    expect(rows.filter(({ place }) => place === SETUP_ROW_PLACES.advanced).map(({ title }) => title)).toEqual([
      "Rooms server",
      "Village",
      "Slack and Discord",
      "Perks",
      "Job board",
      "Mail log",
      "Audit log",
      "Flagged asks",
      "Guided start",
    ]);
  });

  it("says what a fresh install still needs", () => {
    expect(readStates(FRESH_INSTALL)).toEqual([
      ["Mail", "Not yet"],
      ["Features", "8 on"],
      ["Rooms server", "off"],
      ["Village", "Not yet"],
      ["Slack and Discord", "optional"],
      ["Perks", "optional"],
      ["Job board", "on"],
      ["Mail log", "always on"],
      ["Audit log", "always on"],
      ["Flagged asks", "none open"],
      ["Guided start", "optional"],
    ]);
  });

  it("marks each page set up once it is", () => {
    const states = readStates({ ...FRESH_INSTALL, isMailOn: true, hasSendingDomain: true, hasVillageKeys: true, isChatPosting: true, isPerksShown: true, isVoiceOn: true, isVoiceReady: true, openReports: 2 });
    for (const title of ["Mail", "Rooms server", "Village", "Slack and Discord", "Perks"]) expect(states).toContainEqual([title, "Set up"]);
    expect(states).toContainEqual(["Flagged asks", "2 open"]);
  });

  it("sends a switched-off feature's row to its own switch on Features", () => {
    const rows = readSetupRows({ ...FRESH_INSTALL, isNetworkOn: false, isChatOn: false, isPerksOn: false, isJobBoardOn: false });
    const row = (key: string) => rows.find((candidate) => candidate.key === key);
    expect(row("village")).toMatchObject({ state: { kind: SETUP_ROW_STATES.word, text: "off" }, href: "/admin/features#feature-card-network" });
    expect(row("rooms")?.href).toBe("/admin/features#feature-card-voice");
    expect(row("integrations")?.href).toBe("/admin/features#feature-card-chat");
    expect(row("jobs")?.href).toBe("/admin/features#feature-card-job-board");
    // Perks' own page holds the switch that turns it on.
    expect(row("perks")?.href).toBe("/admin/perks");
    // Every row has its own address, so none repeats.
    expect(new Set(rows.map(({ href }) => href)).size).toBe(rows.length);
  });
});
