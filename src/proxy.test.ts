import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { nextConfig } from "../next.config.mjs";

import { MODULES } from "@/modules/registry";
import { saveModuleState } from "@/platform/modules/enablement";
import { MODULE_KINDS, type ToggleableManifest } from "@/platform/modules/manifest";
import { clearDatabase, createTestDatabase } from "@/test/database";

import { isGoneLinkPage } from "./shell/gone-links";
import { proxy } from "./proxy";

const APP_URL = "http://localhost:3000";
const REWRITE_HEADER = "x-middleware-rewrite";

const toggleable = MODULES.map(({ manifest }) => manifest).filter((manifest): manifest is ToggleableManifest => manifest.kind === MODULE_KINDS.toggleable);

const SESSION_COOKIE = "better-auth.session_token=signed-in";
const VISITOR_JOBS_PAGE = "/public/board";

function rewriteOf(path: string, { isSignedIn = false } = {}) {
  const headers = isSignedIn ? { cookie: SESSION_COOKIE } : undefined;
  return proxy(new NextRequest(`${APP_URL}${path}`, { headers })).then((response) => response.headers.get(REWRITE_HEADER));
}

describe("a page of a switched-off module, before it renders", () => {
  const database = createTestDatabase();

  beforeEach(async () => {
    await clearDatabase(database);
  });

  afterAll(async () => {
    await database.$client.end();
  });

  describe.each(toggleable.map((manifest) => ({ id: manifest.id, manifest })))("$id", ({ manifest }) => {
    const pages = manifest.paths.pages.filter((page) => page !== "/");

    it("goes to the not-found page when off", async () => {
      await saveModuleState(database, manifest, false);
      for (const page of pages) expect(await rewriteOf(page), page).toContain("/_module-off");
    });

    it("goes to the not-found page inside the app for a signed-in member", async () => {
      await saveModuleState(database, manifest, false);
      for (const page of pages) expect(await rewriteOf(page, { isSignedIn: true }), page).toContain("/not-here/_module-off");
    });

    it("renders as usual when on", async () => {
      await saveModuleState(database, manifest, true);
      for (const page of pages) expect(await rewriteOf(page, { isSignedIn: true }), page).toBeNull();
    });
  });

  it("shows a visitor at /jobs the public board, and a member the members' board", async () => {
    const jobBoard = toggleable.find(({ id }) => id === "job-board");
    if (!jobBoard) throw new Error("no job board module");
    await saveModuleState(database, jobBoard, true);
    expect(await rewriteOf("/jobs")).toContain(VISITOR_JOBS_PAGE);
    expect(await rewriteOf("/jobs?company=kilnworks")).toContain(`${VISITOR_JOBS_PAGE}?company=kilnworks`);
    expect(await rewriteOf("/jobs", { isSignedIn: true })).toBeNull();
    expect(await rewriteOf("/jobs/yours")).toBeNull();
  });

  // A server bound to 127.0.0.1 behind an https tunnel: Next proxies any rewrite whose address differs from the
  // server's own, over https, and the plain-http server answers 500. Every rewrite keeps the request's own address.
  it("keeps every rewrite on the server's own address (127.0.0.1 behind an https tunnel)", async () => {
    // next.config.mjs turns the URL renaming off; Next's build passes that on to the proxy through this variable.
    expect(nextConfig.skipProxyUrlNormalize).toBe(true);
    vi.stubEnv("__NEXT_NO_MIDDLEWARE_URL_NORMALIZE", "1");
    const tunnelled = "https://127.0.0.1:9494";
    const jobBoard = toggleable.find(({ id }) => id === "job-board");
    if (!jobBoard) throw new Error("no job board module");
    await saveModuleState(database, jobBoard, true);
    const jobs = await proxy(new NextRequest(`${tunnelled}/jobs?company=kilnworks`));
    expect(jobs.headers.get(REWRITE_HEADER)).toBe(`${tunnelled}${VISITOR_JOBS_PAGE}?company=kilnworks`);
    await saveModuleState(database, jobBoard, false);
    const off = await proxy(new NextRequest(`${tunnelled}/jobs`));
    expect(off.headers.get(REWRITE_HEADER)).toBe(`${tunnelled}/_module-off`);
    vi.unstubAllEnvs();
  });

  it("leaves core pages alone", async () => {
    for (const manifest of toggleable) await saveModuleState(database, manifest, false);
    expect(await rewriteOf("/members")).toBeNull();
    expect(await rewriteOf("/")).toBeNull();
  });

  it("finds the bad sign-in and invite links Commonhall answers with 410, and nothing else", async () => {
    for (const path of ["/auth", "/invite"]) {
      expect(await isGoneLinkPage(database, path, null), path).toBe(true);
      expect(await isGoneLinkPage(database, path, "not-a-real-token"), path).toBe(true);
    }
    expect(await isGoneLinkPage(database, "/signin", "not-a-real-token")).toBe(false);
    expect(await isGoneLinkPage(database, "/today", null)).toBe(false);
  });
});

describe("Strict-Transport-Security on pages", () => {
  const database = createTestDatabase();

  afterAll(async () => {
    vi.unstubAllEnvs();
    await database.$client.end();
  });

  it("is sent when APP_URL is https, and never on http", async () => {
    vi.stubEnv("APP_URL", "https://community.example.com");
    const secure = await proxy(new NextRequest("https://community.example.com/signin"));
    expect(secure.headers.get("strict-transport-security")).toBe("max-age=31536000; includeSubDomains");

    vi.stubEnv("APP_URL", APP_URL);
    const local = await proxy(new NextRequest(`${APP_URL}/signin`));
    expect(local.headers.get("strict-transport-security")).toBeNull();
  });
});
