import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { session, user } from "@/platform/database/auth-schema";
import { EVENTUALLY } from "@/test/async-timeouts";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { FAKE_RESEND_API_KEY, startFakeResendServer } from "@/test/fake-resend-server";

const APP_URL = "http://localhost:3000";
const MEMBER = { id: "member-1", name: "Mo Member", email: "mo@example.test" };
const LINK_PATTERN = /\/auth\?token=([A-Za-z0-9_-]+)/;
const CODE_PATTERN = /code where you asked for the link: (\d{6})/;
const JSON_HEADERS = { "Content-Type": "application/json", Origin: APP_URL };

describe("signing in with the 6-digit code from the sign-in email", () => {
  const database = createTestDatabase();
  let resend: Awaited<ReturnType<typeof startFakeResendServer>>;
  let authRoute: typeof import("@/app/api/auth/[...all]/route");
  let linkRoute: typeof import("../sign-in-link/route");
  let codeRoute: typeof import("./route");

  function post(route: { POST: (request: Request) => Promise<Response> }, path: string, body: unknown, headers: Record<string, string> = {}) {
    return route.POST(new Request(`${APP_URL}${path}`, { method: "POST", headers: { ...JSON_HEADERS, ...headers }, body: JSON.stringify(body) }));
  }

  async function requestEmail() {
    const before = resend.state.emails.length;
    await post(authRoute, "/api/auth/sign-in/magic-link", { email: MEMBER.email });
    await vi.waitFor(() => expect(resend.state.emails.length).toBeGreaterThan(before), EVENTUALLY);
    const body = JSON.stringify(resend.state.emails.at(-1)?.body);
    return { token: body.match(LINK_PATTERN)?.[1] ?? "", code: body.match(CODE_PATTERN)?.[1] ?? "" };
  }

  function sendCode(code: string, email = MEMBER.email, headers: Record<string, string> = {}) {
    return post(codeRoute, "/api/sign-in-code", { email, code }, headers);
  }

  function wrong(code: string) {
    return String((Number(code) + 1) % 1_000_000).padStart(6, "0");
  }

  async function countSessions() {
    return (await database.select().from(session).where(eq(session.userId, MEMBER.id))).length;
  }

  beforeAll(async () => {
    resend = await startFakeResendServer();
    vi.stubEnv("APP_URL", APP_URL);
    vi.stubEnv("RESEND_API_KEY", FAKE_RESEND_API_KEY);
    vi.stubEnv("RESEND_FROM_ADDRESS", "Northwind <hello@example.test>");
    vi.stubEnv("RESEND_API_URL", resend.url);
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
    authRoute = await import("@/app/api/auth/[...all]/route");
    linkRoute = await import("../sign-in-link/route");
    codeRoute = await import("./route");
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await resend.stop();
  });

  beforeEach(async () => {
    await clearDatabase(database);
    resend.reset();
    await database.insert(user).values({ ...MEMBER, emailVerified: true, role: "user" });
  });

  it("signs in once with the code, and the email's link stops working", async () => {
    const { token, code } = await requestEmail();
    expect(code).toMatch(/^\d{6}$/);

    const response = await sendCode(code, " MO@example.test ");
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().join(";")).toContain("session_token");
    expect(await countSessions()).toBe(1);

    expect((await sendCode(code)).status).toBe(422);
    expect((await post(linkRoute, "/api/sign-in-link", { token })).status).toBe(410);
    expect(await countSessions()).toBe(1);
  });

  it("stops the code once the link has signed in", async () => {
    const { token, code } = await requestEmail();
    expect((await post(linkRoute, "/api/sign-in-link", { token })).status).toBe(200);

    expect((await sendCode(code)).status).toBe(422);
    expect(await countSessions()).toBe(1);
  });

  it("gives one answer for a wrong code and an unknown address, and drops the code after 5 wrong tries", async () => {
    const { code } = await requestEmail();

    const unknown = await sendCode(code, "nobody@example.test");
    const wrongTry = await sendCode(wrong(code));
    expect(unknown.status).toBe(422);
    expect(await unknown.json()).toEqual(await wrongTry.json());

    for (let index = 0; index < 4; index += 1) expect((await sendCode(wrong(code))).status).toBe(422);
    expect((await sendCode(code)).status).toBe(422);
    expect(await countSessions()).toBe(0);
  });

  it("refuses another site's request", async () => {
    const { code } = await requestEmail();
    expect((await sendCode(code, MEMBER.email, { Origin: "https://elsewhere.example" })).status).toBe(403);
  });
});
