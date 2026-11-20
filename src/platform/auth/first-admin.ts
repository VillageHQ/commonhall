import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";

import { account, user } from "../database/auth-schema.ts";
import type { Database } from "../database/client.ts";
import { communityBranding } from "../branding/schema.ts";
import { INSTANCE_SETTING_KEYS, instanceSettings } from "../settings/schema.ts";

export const GUIDED_START_PENDING = "pending";
export const GUIDED_START_DONE = "done";

const ADMIN_ROLE = "admin";
const CREDENTIAL_PROVIDER_ID = "credential";

// The community's name comes with the first admin (/setup asks both), so an invitee never sees "Your community".
// `pnpm setup:instance` names it with its own branding step, so it may be left out.
export type FirstAdmin = { name: string; email: string; password: string; communityName?: string };

export async function isFirstAdminClaimed(database: Database) {
  const [claim] = await database
    .select({ key: instanceSettings.key })
    .from(instanceSettings)
    .where(eq(instanceSettings.key, INSTANCE_SETTING_KEYS.firstAdminUserId));
  return Boolean(claim);
}

export async function claimFirstAdmin(database: Database, firstAdmin: FirstAdmin) {
  const passwordHash = await hashPassword(firstAdmin.password);
  const userId = randomUUID();

  return database.transaction(async (transaction) => {
    const claims = await transaction
      .insert(instanceSettings)
      .values({ key: INSTANCE_SETTING_KEYS.firstAdminUserId, value: userId })
      .onConflictDoNothing()
      .returning({ key: instanceSettings.key });
    if (claims.length === 0) return { claimed: false };

    await transaction.insert(user).values({
      id: userId,
      name: firstAdmin.name,
      email: firstAdmin.email.toLowerCase(),
      emailVerified: true,
      role: ADMIN_ROLE,
    });
    await transaction.insert(account).values({
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER_ID,
      password: passwordHash,
    });
    if (firstAdmin.communityName) {
      const named = { name: firstAdmin.communityName, savedAt: new Date() };
      await transaction.insert(communityBranding).values(named).onConflictDoUpdate({ target: communityBranding.isSingleton, set: named });
    }
    // The new admin lands on the guided start until it is finished or skipped (src/shell/guided-start.ts).
    await transaction.insert(instanceSettings).values({ key: INSTANCE_SETTING_KEYS.guidedStart, value: GUIDED_START_PENDING });
    return { claimed: true };
  });
}
