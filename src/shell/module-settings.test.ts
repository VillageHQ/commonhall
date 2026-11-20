import { readFileSync } from "node:fs";

import { desc, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/admin/modules/route";
import { MODULE_ERROR_CODES } from "@/modules/admin/contract-modules";
import { feedManifest } from "@/modules/feed/manifest";
import { introsManifest } from "@/modules/intros/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { networkManifest } from "@/modules/network/manifest";
import { voiceManifest } from "@/modules/voice/manifest";
import { AUDIT_ACTIONS } from "@/platform/audit/actions";
import { adminAuditEntry } from "@/platform/audit/schema";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { createSignedInMember } from "@/test/signed-in-member";

import { readFeatureScreen } from "./module-settings";

const APP_URL = "http://localhost:3000";

function setState(cookie: string, moduleId: string, isOn: boolean) {
  return POST(
    new Request(`${APP_URL}/api/admin/modules`, {
      method: "POST",
      headers: { origin: APP_URL, cookie, "content-type": "application/json" },
      body: JSON.stringify({ moduleId, isOn }),
    }),
  );
}

describe("changing a feature", () => {
  const database = createTestDatabase();
  let adminCookie: string;

  beforeEach(async () => {
    await clearDatabase(database);
    adminCookie = (await createSignedInMember(database, "admin")).cookie;
  });

  afterAll(async () => {
    await database.$client.end();
  });

  it("turns it off and writes the audit log", async () => {
    const response = await setState(adminCookie, introsManifest.id, false);
    const [entry] = await database.select().from(adminAuditEntry).orderBy(desc(adminAuditEntry.createdAt));

    expect(response.status).toBe(200);
    expect(await isModuleEnabled(database, introsManifest)).toBe(false);
    expect(entry).toMatchObject({ action: AUDIT_ACTIONS.moduleTurnedOff, detail: introsManifest.label });
  });

  it("turns it back on and writes the audit log", async () => {
    await setState(adminCookie, introsManifest.id, false);

    const response = await setState(adminCookie, introsManifest.id, true);
    const actions = (await database.select().from(adminAuditEntry)).map(({ action }) => action);

    expect(response.status).toBe(200);
    expect(await isModuleEnabled(database, introsManifest)).toBe(true);
    expect(actions).toContain(AUDIT_ACTIONS.moduleTurnedOn);
  });

  it("refuses a member who isn't an admin", async () => {
    const { cookie } = await createSignedInMember(database);

    const response = await setState(cookie, introsManifest.id, false);

    expect(response.status).toBe(403);
    expect(await isModuleEnabled(database, introsManifest)).toBe(true);
  });

  it("refuses a core module", async () => {
    const response = await setState(adminCookie, membersManifest.id, false);

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: MODULE_ERROR_CODES.alwaysOn });
  });

  it("refuses a module it doesn't know", async () => {
    const response = await setState(adminCookie, "nothing", false);

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: MODULE_ERROR_CODES.notFound });
  });

  // No module requires another today, so the refusal itself is covered with made-up modules in
  // src/platform/modules/enablement.test.ts. Intros used to require network; now it works without it.
  it("turns intros on with network off", async () => {
    await setState(adminCookie, introsManifest.id, false);
    await setState(adminCookie, networkManifest.id, false);

    const response = await setState(adminCookie, introsManifest.id, true);

    expect(response.status).toBe(200);
    expect(await isModuleEnabled(database, introsManifest)).toBe(true);
  });

  describe("the screen", () => {
    it("shows intros as working, not paused, while network is off", async () => {
      await setState(adminCookie, networkManifest.id, false);

      const { features } = await readFeatureScreen(database);
      const intros = features.find(({ id }) => id === introsManifest.id);

      expect(intros?.missingRequirement).toBeNull();
      expect(intros?.needsVillage).toBe(false);
    });

    it("says turning off network pauses nothing else", async () => {
      const { features } = await readFeatureScreen(database);
      const network = features.find(({ id }) => id === networkManifest.id);

      expect(network?.dependentLabels).toEqual([]);
    });

    it("lists Rooms first, never a core module, and says what Rooms needs and where Feed sits", async () => {
      const { features } = await readFeatureScreen(database, {});

      expect(features[0]?.id).toBe(voiceManifest.id);
      expect(features[0]?.note).toBe("Needs a voice server");
      expect(features.find(({ id }) => id === feedManifest.id)?.note).toBe("Under More in the menu");
      expect(features.map(({ id }) => id)).not.toContain(membersManifest.id);
    });
  });

  describe("Feed's default (round 6)", () => {
    const MIGRATION = readFileSync(new URL("../../drizzle/0046_feed_off_for_new_communities.sql", import.meta.url), "utf8");

    it("starts a fresh install with Feed off, and keeps it on where members already joined", async () => {
      await clearDatabase(database);
      await database.execute(sql.raw(MIGRATION));
      expect(await isModuleEnabled(database, feedManifest)).toBe(false);

      await createSignedInMember(database);
      await database.execute(sql.raw(MIGRATION));
      expect(await isModuleEnabled(database, feedManifest)).toBe(true);
    });

    it("leaves an admin's own choice alone", async () => {
      await setState(adminCookie, feedManifest.id, false);
      await database.execute(sql.raw(MIGRATION));

      expect(await isModuleEnabled(database, feedManifest)).toBe(false);
    });
  });
});
