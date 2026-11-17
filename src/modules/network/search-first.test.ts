import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { memberNetwork } from "@/modules/members/schema";
import { NETWORK_ERROR_CODES, NETWORK_STAGES, networkPathsSchema, networkSearchResultSchema, networkStatusSchema } from "@/modules/network/contract";
import { saveVillageGroup } from "@/modules/network/service-settings";
import { saveVillageKeys } from "@/platform/village/settings";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { FAKE_VILLAGE_KEYS, startFakeVillageServer } from "@/test/fake-village-server";
import { createSignedInMember } from "@/test/signed-in-member";

import { POST as postConsent } from "@/app/api/network/consent/route";
import { POST as postLinkedin } from "@/app/api/network/linkedin/route";
import { POST as postPaths } from "@/app/api/network/paths/route";
import { POST as postSearch } from "@/app/api/network/search/route";
import { POST as postStatus } from "@/app/api/network/status/route";

const APP_URL = "http://localhost:3000";
const GROUP = { id: "group-1", inviteLink: "https://village.test/join/stored-invite" };
const TARGET_SLUG = "target-person";
const TARGET_URL = `https://www.linkedin.com/in/${TARGET_SLUG}`;
// A slug Village's bulk paths call refuses (its ids must match ^[a-z0-9-]{3,100}$), as "Everywhere" results can carry.
const ACCENTED_URL = "https://www.linkedin.com/in/jos%C3%A9-garc%C3%ADa";
const SEARCH_PATH = "/v2/people/search";
const PATHS_BULK_PATH = "/v2/people/paths/bulk";
const JOIN_PATH = "/v2/groups/join";

type Member = Awaited<ReturnType<typeof createSignedInMember>>;

function jsonRequest(member: Member, body: unknown) {
  return new Request(`${APP_URL}/api/network`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: APP_URL, Cookie: member.cookie },
    body: JSON.stringify(body),
  });
}

function profile(firstName: string, slug: string) {
  return { first_name: firstName, last_name: "Member", linkedin_url: `https://linkedin.com/in/${slug}` };
}

function readCaller(headers: Record<string, string | string[] | undefined>) {
  return String(headers.authorization ?? "").replace("Bearer fake-token.", "");
}

describe("network search needs the member's own connected network", () => {
  const database = createTestDatabase();
  let village: Awaited<ReturnType<typeof startFakeVillageServer>>;

  async function readExternalId(member: Member) {
    const [network] = await database.select().from(memberNetwork).where(eq(memberNetwork.userId, member.userId));
    if (!network) throw new Error("The member has no network row.");
    return network.villageExternalId;
  }

  async function readStatus(member: Member) {
    return networkStatusSchema.parse(await (await postStatus(jsonRequest(member, {}))).json());
  }

  async function addLinkedin(member: Member, slug: string) {
    expect((await postLinkedin(jsonRequest(member, { linkedinUrl: `https://www.linkedin.com/in/${slug}` }))).status).toBe(200);
  }

  async function connect(member: Member, slug: string) {
    await addLinkedin(member, slug);
    await postConsent(jsonRequest(member, { acknowledged: true }));
    await readStatus(member);
    village.state.linkedMembers.set(await readExternalId(member), { status: "ready" });
    expect((await readStatus(member)).stage).toBe(NETWORK_STAGES.ready);
  }

  async function search(member: Member, scope?: "network" | "global") {
    const response = await postSearch(jsonRequest(member, { prompt: "fintech founders", ...(scope ? { scope } : {}) }));
    return { status: response.status, body: await response.json() };
  }

  async function postPathsFor(member: Member) {
    const response = await postPaths(jsonRequest(member, { linkedinSlug: TARGET_SLUG }));
    return { status: response.status, body: await response.json() };
  }

  async function readPaths(member: Member) {
    const { status, body } = await postPathsFor(member);
    expect(status).toBe(200);
    return networkPathsSchema.parse(body);
  }

  beforeAll(async () => {
    village = await startFakeVillageServer();
    process.env.VILLAGE_API_URL = village.url;
    process.env.VILLAGE_APP_URL = "https://app.village.test";
  });

  afterAll(async () => {
    delete process.env.VILLAGE_API_URL;
    delete process.env.VILLAGE_APP_URL;
    await village.stop();
  });

  beforeEach(async () => {
    await clearDatabase(database);
    village.reset();
    await saveVillageKeys(database, FAKE_VILLAGE_KEYS);
    await saveVillageGroup(database, GROUP);
    village.state.searchPeople = [{ full_name: "Target Person", linkedin_url: TARGET_URL, headline: "Founder" }];
  });

  it("gives a member who hasn't connected the member profiles, and calls Village for nothing", async () => {
    const sharer = await createSignedInMember(database);
    await connect(sharer, "sharing-member");
    const newcomer = await createSignedInMember(database);
    const before = village.state.requests.length;

    expect(await readStatus(newcomer)).toMatchObject({ stage: NETWORK_STAGES.needsLinkedin, canSearch: false });
    const { status, body } = await search(newcomer);

    expect(status).toBe(200);
    expect(networkSearchResultSchema.parse(body)).toMatchObject({ isProfilesOnly: true, people: [], includesOwnNetwork: false });
    const calls = village.state.requests.slice(before).map(({ path }) => path);
    expect(calls).not.toContain(SEARCH_PATH);
    expect(calls).not.toContain(JOIN_PATH);
  });

  it("asks a member who hasn't connected to connect before looking up paths", async () => {
    const newcomer = await createSignedInMember(database);

    const { status, body } = await postPathsFor(newcomer);

    expect(status).toBe(409);
    expect(body).toMatchObject({ code: NETWORK_ERROR_CODES.connectNeeded });
  });

  it("never names a member who refused, even as the contact a sharer goes through", async () => {
    const sharer = await createSignedInMember(database);
    await connect(sharer, "sharing-member");
    const refuser = await createSignedInMember(database);
    await addLinkedin(refuser, "refusing-member");
    const viewer = await createSignedInMember(database);
    await connect(viewer, "viewer-member");
    village.state.pathsByUrl.set(TARGET_URL, {
      summary: "s",
      paths: [
        { degree: 3, description: "refuser via sharer", introducer: profile("Test", "refusing-member"), starter: profile("Test", "sharing-member") },
        { degree: 2, description: "via my own contact", introducer: profile("Own", "own-contact") },
      ],
    });

    const paths = await readPaths(viewer);

    expect(paths.paths.map(({ description }) => description)).toEqual(["via my own contact"]);
    expect(JSON.stringify(paths)).not.toContain("refusing-member");
  });

  it("searches as the member once they connect, their own contacts included", async () => {
    const newcomer = await createSignedInMember(database);
    await connect(newcomer, "new-member");

    const result = networkSearchResultSchema.parse((await search(newcomer)).body);

    expect(result).toMatchObject({ isProfilesOnly: false, includesOwnNetwork: true });
    expect(result.people.map(({ fullName }) => fullName)).toEqual(["Target Person"]);
    expect(readCaller(village.readRequests(SEARCH_PATH).at(-1)?.headers ?? {})).toBe(await readExternalId(newcomer));
  });

  it("keeps the paths on an Everywhere page when one result's LinkedIn name isn't a plain slug", async () => {
    const sharer = await createSignedInMember(database);
    await connect(sharer, "sharing-member");
    const viewer = await createSignedInMember(database);
    await connect(viewer, "viewer-member");
    village.state.searchPeople = [
      { full_name: "Target Person", linkedin_url: TARGET_URL, headline: "Founder" },
      { full_name: "José García", linkedin_url: ACCENTED_URL, headline: "Head of procurement" },
    ];
    village.state.pathsByUrl.set(TARGET_URL, { summary: "s", paths: [{ degree: 2, description: "via sharer", introducer: profile("Test", "sharing-member") }] });

    const result = networkSearchResultSchema.parse((await search(viewer, "global")).body);

    expect(result.people.map(({ fullName }) => fullName).toSorted()).toEqual(["José García", "Target Person"]);
    expect(result.people.find(({ fullName }) => fullName === "Target Person")?.paths.map(({ memberId }) => memberId)).toEqual([sharer.userId]);
    expect(result.pathsUnavailable).toBe(false);
    expect(village.readRequests(PATHS_BULK_PATH).map(({ body }) => body)).toEqual([{ linkedin_ids: [TARGET_SLUG] }]);
  });

  it("says the paths couldn't load, rather than that nobody knows them, when Village fails the page's paths", async () => {
    const viewer = await createSignedInMember(database);
    await connect(viewer, "viewer-member");
    village.state.failures.set(PATHS_BULK_PATH, { status: 500, type: "internal_error" });

    const { status, body } = await search(viewer, "global");

    expect(status).toBe(200);
    const result = networkSearchResultSchema.parse(body);
    expect(result.people.map(({ fullName }) => fullName)).toEqual(["Target Person"]);
    expect(result.pathsUnavailable).toBe(true);
  });

  it("finds member profiles only while Village isn't set up", async () => {
    const newcomer = await createSignedInMember(database);
    await database.delete((await import("@/platform/settings/schema")).instanceSettings);

    expect(await readStatus(newcomer)).toMatchObject({ stage: NETWORK_STAGES.notConfigured, canSearch: false });
    expect(await search(newcomer)).toMatchObject({ status: 200, body: { isProfilesOnly: true, people: [] } });
  });
});
