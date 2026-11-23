import { createVillage, isVillageError } from "@villagehq/sdk";

import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";

import { syncTokenSchema, type NetworkStatus } from "../contract";

export type VillageSyncTarget = NonNullable<NetworkStatus["sync"]>;

async function readSyncToken() {
  const { token } = await postRequest(API_ROUTES.networkSyncToken, {}, syncTokenSchema);
  return token;
}

// Village's way for an app that pays (docs.village.ai/build/pay-for-your-users): a client whose token comes from this
// site's server, then connect(). It opens Village's sync window for the member the token names; with test keys it
// connects Village's made-up user at once. connect() reads the member's status after; the page reads its own, so only a
// failed token counts as a failure here, with the token route's own words.
export async function openVillageSync({ appUrl, apiUrl }: VillageSyncTarget) {
  const village = createVillage({ token: readSyncToken, appUrl, ...(apiUrl ? { apiUrl } : {}) });
  try {
    await village.connect();
  } catch (error) {
    if (isVillageError(error, "token_failed") && error.cause instanceof Error) throw error.cause;
    if (!isVillageError(error)) throw error;
  }
}
