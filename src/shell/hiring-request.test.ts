import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST as postCreate } from "@/app/api/asks/create/route";
import { POST as postOwn } from "@/app/api/asks/own/route";
import { POST as postAddJob } from "@/app/api/job-board/jobs/add/route";
import { ASK_CATEGORIES, ownAsksSchema } from "@/modules/asks/contract";
import { asksManifest } from "@/modules/asks/manifest";
import { ask } from "@/modules/asks/schema";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { readBoardJobs } from "@/modules/job-board/reads";
import { memberProfile } from "@/modules/members/schema";
import { saveModuleState } from "@/platform/modules/enablement";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { createSignedInMember } from "@/test/signed-in-member";

const APP_URL = "http://localhost:3000";
type Member = Awaited<ReturnType<typeof createSignedInMember>>;
type Handler = (request: Request) => Promise<Response>;

function call(handler: Handler, member: Member, body: unknown = {}) {
  return handler(
    new Request(`${APP_URL}/api/asks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: APP_URL, Cookie: member.cookie },
      body: JSON.stringify(body),
    }),
  );
}

// Round 7 (less-choice Part 5): "Post a hiring request" from a job uses no weekly ask. The job is checked when the ask
// posts, so a member can't skip the allowance by naming a job they don't hire for.
describe("a hiring request made from a job", () => {
  const database = createTestDatabase();
  let founder: Member;
  let other: Member;
  let jobId: string;

  async function readAsksUsed(member: Member) {
    return ownAsksSchema.parse(await (await call(postOwn, member)).json()).allowance.used;
  }

  beforeEach(async () => {
    await clearDatabase(database);
    await saveModuleState(database, jobBoardManifest, true);
    await saveModuleState(database, asksManifest, true);
    [founder, other] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    await database.insert(memberProfile).values([
      { userId: founder.userId, company: "Tallyhealth" },
      { userId: other.userId, company: "Ledgerline" },
    ]);
    expect((await call(postAddJob, founder, { title: "Founding backend engineer", location: "Boston" })).status).toBe(200);
    const [job] = await readBoardJobs(database, null);
    if (!job) throw new Error("no job");
    jobId = job.id;
  });

  afterAll(async () => {
    await database.$client.end();
  });

  it("leaves the asks left unchanged, while an ordinary ask uses one", async () => {
    const hiring = await call(postCreate, founder, { title: "We're hiring a Founding backend engineer at Tallyhealth. Who do you know?", category: ASK_CATEGORIES.hire, hiringJobId: jobId });
    expect(hiring.status).toBe(200);
    expect(await readAsksUsed(founder)).toBe(0);

    expect((await call(postCreate, founder, { title: "Who knows a head of sales who sold to hospitals?" })).status).toBe(200);
    expect(await readAsksUsed(founder)).toBe(1);
    expect((await database.select({ category: ask.category, hiringJobId: ask.hiringJobId }).from(ask)).map(({ category, hiringJobId }) => [category, hiringJobId]).sort()).toEqual([
      [ASK_CATEGORIES.advice, null],
      [ASK_CATEGORIES.hire, jobId],
    ]);
  });

  it("is free once a week per job: a second request for the same job uses an ask", async () => {
    const draft = { title: "We're hiring a Founding backend engineer at Tallyhealth. Who do you know?", category: ASK_CATEGORIES.hire, hiringJobId: jobId };
    expect((await call(postCreate, founder, draft)).status).toBe(200);
    expect((await call(postCreate, founder, { ...draft, title: "Anyone know a good accountant in Boston?" })).status).toBe(200);
    expect(await readAsksUsed(founder)).toBe(1);
    expect((await database.select({ hiringJobId: ask.hiringJobId }).from(ask)).map(({ hiringJobId }) => hiringJobId).sort()).toEqual([jobId, null]);
  });

  it("refuses a job the member doesn't hire for, and a made-up one, posting nothing", async () => {
    expect((await call(postCreate, other, { title: "Free ask, please", hiringJobId: jobId })).status).toBe(404);
    expect((await call(postCreate, founder, { title: "Free ask, please", hiringJobId: "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b" })).status).toBe(404);
    expect(await database.select().from(ask)).toEqual([]);
  });

  it("counts like any other when the category alone says hire", async () => {
    expect((await call(postCreate, founder, { title: "We're hiring a designer", category: ASK_CATEGORIES.hire })).status).toBe(200);
    expect(await readAsksUsed(founder)).toBe(1);
  });
});
