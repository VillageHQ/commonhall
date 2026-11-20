import { describe, expect, it } from "vitest";

import { readAdminTabs } from "./admin-tabs";

const labels = (pathname: string, hidden: string[] = []) => readAdminTabs(pathname, hidden).map(({ label }) => label);

describe("the console's merged areas", () => {
  it("shows Members' five pages as tabs on each of them", () => {
    for (const page of ["/admin/members", "/admin/invites", "/admin/import", "/admin/links", "/admin/calls", "/admin/members/some-id"]) {
      expect(labels(page)).toEqual(["Members", "Invites", "Import", "Sign-in links", "Calls"]);
    }
  });

  it("puts the asks and the intro log together, and drops a tab whose module is off", () => {
    expect(labels("/admin/intros")).toEqual(["Asks", "Intro log"]);
    expect(labels("/admin/asks", ["/admin/intros"])).toEqual([]);
  });

  it("puts the weekly email beside the announcements", () => {
    expect(labels("/admin/digest")).toEqual(["Announcements", "Weekly email"]);
  });

  it("adds nothing to pages outside the merged areas", () => {
    for (const page of ["/admin", "/admin/settings", "/admin/report", "/admin/rooms"]) expect(labels(page)).toEqual([]);
  });
});
