import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { GET as getFile } from "@/app/api/library/files/[fileId]/route";
import { POST as postFeature } from "@/app/api/library/feature/route";
import { POST as postPublish } from "@/app/api/library/publish/route";
import { POST as postRemove } from "@/app/api/library/remove/route";
import { POST as postVote } from "@/app/api/library/vote/route";
import { post } from "@/modules/feed/schema";
import { LIBRARY_VISIBILITIES } from "@/modules/library/contract";
import { readLeaderboard, readLibraryItem, readLibraryItems, readLibraryViewer, startOfMonth } from "@/modules/library/reads";
import { libraryFile, libraryItem, libraryVote } from "@/modules/library/schema";
import { deleteMemberLibrary } from "@/modules/library/service";
import { memberProfile } from "@/modules/members/schema";
import { AUDIT_ACTIONS } from "@/platform/audit/actions";
import { adminAuditEntry } from "@/platform/audit/schema";
import { user } from "@/platform/database/auth-schema";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { createSignedInMember } from "@/test/signed-in-member";

const APP_URL = "http://localhost:3000";
const FAKE_KEY = ["sk-", "proj-", "Zq8Lm2Nx7Vb4Kc9Rt6Wp3Yh"].join("");

type Member = { userId: string; cookie: string };

describe("the library", () => {
  const database = createTestDatabase();

  beforeEach(async () => {
    await clearDatabase(database);
  });

  afterAll(async () => {
    await database.$client.end();
  });

  async function member(profile: { company?: string; communityRole?: "founder" | "fund_team" } = {}, role: "admin" | "user" = "user") {
    const created = await createSignedInMember(database, role);
    await database.insert(memberProfile).values({ userId: created.userId, company: profile.company ?? null, communityRole: profile.communityRole ?? "founder" });
    return created;
  }

  function postJson(handler: (request: Request) => Promise<Response>, path: string, { cookie }: Member, body: unknown) {
    return handler(new Request(`${APP_URL}${path}`, { method: "POST", headers: { "content-type": "application/json", origin: APP_URL, cookie }, body: JSON.stringify(body) }));
  }

  function publish({ cookie }: Member, item: Record<string, unknown>, files: { name: string; text: string }[] = []) {
    const form = new FormData();
    form.set("item", JSON.stringify({ title: "Cold email reviewer", pitch: "Scores a cold email", kind: "prompt", job: "sales", ...item }));
    for (const file of files) form.append("files", new File([file.text], file.name));
    return postPublish(new Request(`${APP_URL}/api/library/publish`, { method: "POST", headers: { origin: APP_URL, cookie }, body: form }));
  }

  async function publishId(author: Member, item: Record<string, unknown> = {}, files = [{ name: "prompt.md", text: "# A prompt" }]) {
    const response = await publish(author, item, files);
    expect(response.status).toBe(200);
    return ((await response.json()) as { id: string }).id;
  }

  function downloadFile({ cookie }: Member, fileId: string) {
    return getFile(new Request(`${APP_URL}/api/library/files/${fileId}`, { headers: { cookie } }), { params: Promise.resolve({ fileId }) });
  }

  it("shows an item only to the audience it names; anyone else gets 404", async () => {
    const author = await member({ company: "Ledgerline" });
    const fundTeam = await member({ communityRole: "fund_team" });
    const atGridwise = await member({ company: " gridwise " });
    const outsider = await member({ company: "Kilnworks" });
    const admin = await member({}, "admin");
    const forTeam = await publishId(author, { title: "Team only", visibility: LIBRARY_VISIBILITIES.fundTeam });
    const forCompanies = await publishId(author, { title: "Two companies", visibility: LIBRARY_VISIBILITIES.companies, companies: ["Gridwise", "Paperplane"] });
    const forAll = await publishId(author, { title: "Everyone" });

    const titlesFor = async (viewer: Member, isAdmin = false) =>
      (await readLibraryItems(database, await readLibraryViewer(database, { id: viewer.userId, email: "", role: isAdmin ? "admin" : "user" }), { kind: null, job: null, search: null }))
        .map(({ title }) => title)
        .sort();
    expect(await titlesFor(outsider)).toEqual(["Everyone"]);
    expect(await titlesFor(fundTeam)).toEqual(["Everyone", "Team only"]);
    expect(await titlesFor(atGridwise)).toEqual(["Everyone", "Two companies"]);
    expect(await titlesFor(author)).toEqual(["Everyone", "Team only", "Two companies"]);
    expect(await titlesFor(admin, true)).toEqual(["Everyone", "Team only", "Two companies"]);

    // The API answers 404 to a member outside the audience, for votes and for the files.
    expect((await postJson(postVote, "/api/library/vote", outsider, { itemId: forTeam, isUpvoted: true })).status).toBe(404);
    expect((await postJson(postVote, "/api/library/vote", outsider, { itemId: forCompanies, isUpvoted: true })).status).toBe(404);
    const [teamFile] = await database.select({ id: libraryFile.id }).from(libraryFile).where(sql`${libraryFile.versionId} in (select id from library_version where item_id = ${forTeam})`);
    expect((await downloadFile(outsider, teamFile?.id ?? "")).status).toBe(404);
    const download = await downloadFile(fundTeam, teamFile?.id ?? "");
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("attachment");
    expect(await download.text()).toBe("# A prompt");
    expect((await postJson(postVote, "/api/library/vote", outsider, { itemId: forAll, isUpvoted: true })).status).toBe(200);
    // The leaderboard counts only what the viewer may see, so it never hints at a hidden item.
    await database.insert(libraryVote).values({ itemId: forTeam, voterId: fundTeam.userId });
    const boardFor = async (viewer: Member) => (await readLeaderboard(database, await readLibraryViewer(database, { id: viewer.userId, email: "" }), "all")).people.map(({ upvotes }) => upvotes);
    expect(await boardFor(outsider)).toEqual([1]);
    expect(await boardFor(fundTeam)).toEqual([2]);
  });

  it("refuses an upload with a secret, naming the file and line, and stores nothing", async () => {
    const author = await member();
    const response = await publish(author, {}, [
      { name: "README.md", text: "# Agent" },
      { name: "config.yaml", text: `model: fast\nopenai_api_key: ${FAKE_KEY}\n` },
    ]);
    expect(response.status).toBe(422);
    expect(((await response.json()) as { message: string }).message).toContain("“config.yaml” line 2");
    expect(await database.select().from(libraryItem)).toEqual([]);
    expect(await database.select({ id: libraryFile.id }).from(libraryFile)).toEqual([]);

    expect((await publish(author, {}, [{ name: "tool.exe", text: "MZ" }])).status).toBe(422);
  });

  it("counts one upvote per member, undoes it, and never lets you upvote your own item", async () => {
    const author = await member();
    const voter = await member();
    const itemId = await publishId(author);
    const vote = (who: Member, isUpvoted: boolean) => postJson(postVote, "/api/library/vote", who, { itemId, isUpvoted });

    expect(await (await vote(voter, true)).json()).toEqual({ upvotes: 1, isUpvoted: true });
    expect(await (await vote(voter, true)).json()).toEqual({ upvotes: 1, isUpvoted: true });
    expect(await (await vote(voter, false)).json()).toEqual({ upvotes: 0, isUpvoted: false });
    expect((await vote(author, true)).status).toBe(422);
    expect(await database.select().from(libraryVote)).toEqual([]);
  });

  it("ranks people and companies by upvotes received, this month and all time, matching the votes and skipping removed items", async () => {
    const priya = await member({ company: "Ledgerline" });
    const grace = await member({ company: "ledgerline " });
    const ada = await member({ company: "Gridwise" });
    const voters = await Promise.all([member(), member(), member()]);
    const priyaItem = await publishId(priya);
    const graceItem = await publishId(grace);
    const adaItem = await publishId(ada);
    const removedItem = await publishId(ada, { title: "Gone soon" });
    const now = new Date();
    const lastMonth = new Date(startOfMonth(now).getTime() - 24 * 60 * 60 * 1000);
    const votes = [
      [priyaItem, voters[0], now],
      [priyaItem, voters[1], now],
      [graceItem, voters[0], lastMonth],
      [adaItem, voters[0], now],
      [adaItem, voters[1], lastMonth],
      [adaItem, voters[2], lastMonth],
      [removedItem, voters[0], now],
    ] as const;
    for (const [itemId, voter, createdAt] of votes) await database.insert(libraryVote).values({ itemId, voterId: voter?.userId ?? "", createdAt });
    const admin = await member({}, "admin");
    expect((await postJson(postRemove, "/api/library/remove", admin, { itemId: removedItem })).status).toBe(200);

    const adminViewer = await readLibraryViewer(database, { id: admin.userId, email: "", role: "admin" });
    const allTime = await readLeaderboard(database, adminViewer, "all", now);
    expect(allTime.people.map(({ member: person, upvotes }) => [person.id, upvotes])).toEqual(
      expect.arrayContaining([
        [ada.userId, 3],
        [priya.userId, 2],
        [grace.userId, 1],
      ]),
    );
    expect(allTime.people[0]?.member.id).toBe(ada.userId);
    // Companies by name without case or spaces: Ledgerline has Priya's 2 and Grace's 1.
    expect(allTime.companies.map(({ company, upvotes, people }) => [company.toLowerCase(), upvotes, people])).toEqual([
      ["gridwise", 3, 1],
      ["ledgerline", 3, 2],
    ]);
    const [{ total } = { total: 0 }] = await database.select({ total: sql<number>`count(*)`.mapWith(Number) }).from(libraryVote);
    expect(allTime.people.reduce((sum, { upvotes }) => sum + upvotes, 0)).toBe(total);

    const month = await readLeaderboard(database, adminViewer, "month", now);
    expect(month.people.map(({ member: person, upvotes }) => [person.id, upvotes])).toEqual([
      [priya.userId, 2],
      [ada.userId, 1],
    ]);
  });

  it("lets admins feature and remove, in the audit log; members can't feature", async () => {
    const author = await member();
    const admin = await member({}, "admin");
    const itemId = await publishId(author);
    expect((await postJson(postFeature, "/api/library/feature", author, { itemId, isFeatured: true })).status).toBe(403);
    expect((await postJson(postFeature, "/api/library/feature", admin, { itemId, isFeatured: true })).status).toBe(200);
    const viewer = await readLibraryViewer(database, { id: author.userId, email: "" });
    expect((await readLibraryItem(database, viewer, itemId))?.isFeatured).toBe(true);
    // The feed (on where no admin chose) got a post announcing it; the removal takes the post too.
    expect((await database.select({ body: post.body }).from(post)).map(({ body }) => body)).toEqual([expect.stringContaining("Shared in the library: Cold email reviewer")]);
    expect((await postJson(postRemove, "/api/library/remove", admin, { itemId })).status).toBe(200);
    expect(await readLibraryItem(database, viewer, itemId)).toBeNull();
    expect(await database.select().from(post)).toEqual([]);
    const audit = await database.select({ action: adminAuditEntry.action }).from(adminAuditEntry);
    expect(audit.map(({ action }) => action)).toEqual(expect.arrayContaining([AUDIT_ACTIONS.libraryItemFeatured, AUDIT_ACTIONS.libraryItemRemoved]));
  });

  it("keeps a removed member's items only when the admin keeps their content", async () => {
    const leaving = await member();
    const staying = await member();
    const admin = await member({}, "admin");
    const itemId = await publishId(leaving);
    const viewer = await readLibraryViewer(database, { id: staying.userId, email: "" });

    await database.update(user).set({ banned: true }).where(eq(user.id, leaving.userId));
    expect(await readLibraryItem(database, viewer, itemId)).toBeNull();
    await database.transaction((transaction) => deleteMemberLibrary(transaction, { memberId: leaving.userId, memberName: "Test Member", actorId: admin.userId, keepsContent: false }));
    expect(await database.select().from(libraryItem)).toEqual([]);
  });
});
