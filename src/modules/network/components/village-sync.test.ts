import { VillageError } from "@villagehq/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ createVillage: vi.fn(), connect: vi.fn() }));

vi.mock("@villagehq/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@villagehq/sdk")>();
  return { ...actual, createVillage: sdk.createVillage };
});

import { openVillageSync } from "./village-sync";

const TARGET = { appUrl: "https://village.test", apiUrl: "https://api.village.test" };

describe("the sync step", () => {
  beforeEach(() => {
    sdk.createVillage.mockReturnValue({ connect: sdk.connect });
    sdk.connect.mockResolvedValue({ status: "syncing" });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ token: "member-token" })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("connects through a Village client whose token comes from this site", async () => {
    await openVillageSync(TARGET);

    const [options] = sdk.createVillage.mock.calls[0] as [{ token: () => Promise<string>; appUrl: string; apiUrl?: string }];
    expect(options).toMatchObject({ appUrl: TARGET.appUrl, apiUrl: TARGET.apiUrl });
    await expect(options.token()).resolves.toBe("member-token");
    expect(sdk.connect).toHaveBeenCalledOnce();
  });

  it("leaves Village's own API address to the SDK when none is set", async () => {
    await openVillageSync({ appUrl: TARGET.appUrl, apiUrl: null });

    expect(sdk.createVillage.mock.calls[0]?.[0]).not.toHaveProperty("apiUrl");
  });

  it("shows the token route's own words when it refuses", async () => {
    const refusal = new Error("Your network doesn't need a sync right now.");
    sdk.connect.mockRejectedValue(new VillageError({ code: "token_failed", message: "Couldn't get a Village token for this user.", cause: refusal }));

    await expect(openVillageSync(TARGET)).rejects.toBe(refusal);
  });

  it("doesn't call it a failure when only the status read after the window fails", async () => {
    sdk.connect.mockRejectedValue(new VillageError({ code: "network", message: "Couldn't reach Village." }));

    await expect(openVillageSync(TARGET)).resolves.toBeUndefined();
  });
});
