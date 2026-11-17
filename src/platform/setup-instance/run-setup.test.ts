import { describe, expect, it } from "vitest";

import { DEMO_FOUNDERS_CSV, runSetup } from "./run-setup.ts";
import { parseSetupFile, type LoadedSetup } from "./setup-file.ts";

const APP_URL = "http://127.0.0.1:9999";
const SECRETS = { setupToken: "a-setup-token-long-enough", adminPassword: "correct-horse-battery-9", villageSecretKey: "sk_fake" };

type Call = { method: string; path: string; origin: string | null; cookie: string | null; body: string | null };

// A fake app: answers each route the way the real one does, and records every call.
function fakeApp(overrides: Record<string, () => Response> = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const body = init?.body === undefined ? null : typeof init.body === "string" ? init.body : new TextDecoder().decode(init.body as Uint8Array);
    calls.push({ method: init?.method ?? "GET", path: url.pathname + url.search, origin: headers.get("origin"), cookie: headers.get("cookie"), body });
    const override = overrides[url.pathname];
    if (override) return override();
    if (url.pathname === "/api/setup") return Response.json({ message: "Admin created." }, { status: 201 });
    if (url.pathname === "/api/auth/sign-in/email") return new Response("{}", { headers: { "Set-Cookie": "session=abc; Path=/; HttpOnly" } });
    if (url.pathname === "/api/admin/invites/import") return Response.json({ importedCount: 2, notImportedCount: 0 });
    if (url.pathname === "/api/admin/members/waiting") {
      return Response.json({ members: [{ id: "m1", email: "one@example.com", isReportedNotThem: false }, { id: "m2", email: "two@example.com", isReportedNotThem: true }] });
    }
    return Response.json({ message: "ok" });
  }) as typeof fetch;
  return { calls, fetchImpl };
}

function loadedSetup(text: string, extra: Partial<LoadedSetup> = {}): LoadedSetup {
  const parsed = parseSetupFile(text);
  if ("error" in parsed) throw new Error(parsed.error);
  return { setup: parsed.setup, logo: null, membersCsv: null, ...extra };
}

const FULL = JSON.stringify({
  admin: { name: "Robin Organizer", email: "robin@example.com" },
  brand: { name: "Northwind Founders", accent: "#7A3E9D", logo: "logo.png" },
  village: { publicKey: "pk_fake" },
  members: { csv: "members.csv" },
  confirmWaiting: true,
});

describe("the setup file", () => {
  it("refuses a secret written into it, wherever it sits", () => {
    expect(parseSetupFile(JSON.stringify({ admin: { name: "R", email: "r@example.com", password: "x" } }))).toEqual({ error: expect.stringContaining("admin.password") });
    expect(parseSetupFile(JSON.stringify({ admin: { name: "R", email: "r@example.com" }, village: { publicKey: "pk", secretKey: "sk" } }))).toEqual({ error: expect.stringContaining("village.secretKey") });
  });

  it("names the field that needs a fix", () => {
    expect(parseSetupFile(JSON.stringify({ admin: { name: "R", email: "not-an-email" } }))).toEqual({ error: expect.stringContaining("admin.email") });
    expect(parseSetupFile(JSON.stringify({}))).toEqual({ error: "admin: add the admin's name and email." });
    // The brand sets the whole look, so the colour must be there: a rerun never resets it to a default.
    expect(parseSetupFile(JSON.stringify({ admin: { name: "R", email: "r@example.com" }, brand: { name: "N" } }))).toEqual({ error: expect.stringContaining("brand.accent") });
    expect(parseSetupFile(JSON.stringify({ admin: { name: "R", email: "r@example.com" }, members: { csv: "m.csv", basis: "terms" } }))).toEqual({ error: expect.stringContaining("termsDate") });
  });
});

describe("runSetup", () => {
  it("runs every step through the page routes, with the app's origin, the session cookie and email off", async () => {
    const app = fakeApp();
    const csv = "name,email\nSam,sam@example.com";
    const { ok } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL, { logo: new Uint8Array([1, 2, 3]), membersCsv: csv }), secrets: SECRETS, demo: true, fetchImpl: app.fetchImpl });

    expect(ok).toBe(true);
    expect(app.calls.map(({ path }) => path.split("?")[0])).toEqual([
      "/api/setup",
      "/api/auth/sign-in/email",
      "/api/branding/logo",
      "/api/admin/branding",
      "/api/admin/village/keys",
      "/api/admin/invites/import",
      "/api/admin/invites/import",
      "/api/admin/members/waiting",
      "/api/admin/members/confirm",
    ]);
    expect(app.calls.every(({ origin }) => origin === APP_URL)).toBe(true);
    expect(app.calls.slice(2).every(({ cookie }) => cookie === "session=abc")).toBe(true);
    const imports = app.calls.filter(({ path }) => path.startsWith("/api/admin/invites/import"));
    expect(imports.every(({ path }) => new URL(path, APP_URL).searchParams.get("invite") === "0")).toBe(true);
    expect(imports.map(({ body }) => body)).toEqual([csv, DEMO_FOUNDERS_CSV]);
    // The member reported "not me" is left to a person.
    expect(app.calls.filter(({ path }) => path === "/api/admin/members/confirm").map(({ body }) => body)).toEqual([JSON.stringify({ memberId: "m1" })]);
  });

  it("the made-up founders are example.com addresses only", () => {
    const emails = DEMO_FOUNDERS_CSV.split("\n").slice(1).map((line) => line.split(",")[1]);
    expect(emails.every((email) => email?.endsWith("@example.com"))).toBe(true);
  });

  it("a refused logo stops before the look is saved, so nothing changes", async () => {
    const app = fakeApp({ "/api/branding/logo": () => Response.json({ message: "Use a PNG, JPEG or WebP image. SVG files aren't accepted." }, { status: 422 }) });
    const { ok } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL, { logo: new Uint8Array([60]) }), secrets: SECRETS, demo: false, fetchImpl: app.fetchImpl });

    expect(ok).toBe(false);
    expect(app.calls.some(({ path }) => path === "/api/admin/branding")).toBe(false);
  });

  it("prints each line the import left out, with the reason", async () => {
    const app = fakeApp({ "/api/admin/invites/import": () => Response.json({ importedCount: 0, notImportedCount: 1, notImported: [{ line: 1, why: "There's no email address in this row." }] }) });
    const { steps } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL, { membersCsv: "sam@example.com" }), secrets: SECRETS, demo: false, fetchImpl: app.fetchImpl });

    expect(steps).toContainEqual({ step: "Members", outcome: "skipped", detail: "members.csv line 1: There's no email address in this row." });
  });

  it("stops at a wrong setup token and calls nothing after it", async () => {
    const app = fakeApp({ "/api/setup": () => Response.json({ message: "The setup token is wrong." }, { status: 401 }) });
    const { ok, steps } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL), secrets: SECRETS, demo: false, fetchImpl: app.fetchImpl });

    expect(ok).toBe(false);
    expect(steps).toEqual([{ step: "Admin", outcome: "failed", detail: "The setup token is wrong." }]);
    expect(app.calls).toHaveLength(1);
  });

  it("an existing admin signs in instead; a refused Village key is reported and the rest goes on", async () => {
    const app = fakeApp({
      "/api/setup": () => Response.json({ message: "Setup is already complete." }, { status: 409 }),
      "/api/admin/village/keys": () => Response.json({ message: "Village didn't accept this secret key." }, { status: 422 }),
    });
    const { ok, steps } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL), secrets: SECRETS, demo: false, fetchImpl: app.fetchImpl });

    expect(ok).toBe(false);
    expect(steps.find(({ step }) => step === "Admin")?.outcome).toBe("skipped");
    expect(steps.find(({ step }) => step === "Village")).toEqual({ step: "Village", outcome: "failed", detail: expect.stringContaining("Not connected: Village didn't accept this secret key.") });
    expect(steps.some(({ step }) => step === "Confirm")).toBe(true);
  });

  it("skips Village with a plain line when the secret key is not in the environment", async () => {
    const app = fakeApp();
    const { steps } = await runSetup({ url: APP_URL, loaded: loadedSetup(FULL), secrets: { ...SECRETS, villageSecretKey: null }, demo: false, fetchImpl: app.fetchImpl });

    expect(steps.find(({ step }) => step === "Village")).toEqual({ step: "Village", outcome: "skipped", detail: expect.stringContaining("VILLAGE_SECRET_KEY is not set") });
    expect(app.calls.some(({ path }) => path === "/api/admin/village/keys")).toBe(false);
  });
});
