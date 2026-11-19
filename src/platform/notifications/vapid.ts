import { eq } from "drizzle-orm";
import webPush from "web-push";

import type { DatabaseOrTransaction } from "../database/client.ts";
import type { Environment } from "../environment.ts";
import { resolveAppUrl } from "../http/app-url.ts";
import { INSTANCE_SETTING_KEYS, instanceSettings } from "../settings/schema.ts";

// Each server makes its own VAPID key pair the first time it needs one and keeps it in its settings: no central
// service, nothing to configure. The first writer wins, so two instances starting at once agree on one pair.

export type VapidKeys = { publicKey: string; privateKey: string };

function parseKeys(value: string | undefined): VapidKeys | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<VapidKeys>;
    return typeof parsed.publicKey === "string" && typeof parsed.privateKey === "string" ? { publicKey: parsed.publicKey, privateKey: parsed.privateKey } : null;
  } catch {
    return null;
  }
}

export async function readVapidKeys(database: DatabaseOrTransaction): Promise<VapidKeys> {
  const key = INSTANCE_SETTING_KEYS.vapidKeys;
  await database
    .insert(instanceSettings)
    .values({ key, value: JSON.stringify(webPush.generateVAPIDKeys()) })
    .onConflictDoNothing();
  const [stored] = await database.select({ value: instanceSettings.value }).from(instanceSettings).where(eq(instanceSettings.key, key));
  const keys = parseKeys(stored?.value);
  if (keys) return keys;
  // A damaged value: replace it. Old subscriptions then fail and are dropped; browsers subscribe again.
  const fresh = webPush.generateVAPIDKeys();
  await database.update(instanceSettings).set({ value: JSON.stringify(fresh), updatedAt: new Date() }).where(eq(instanceSettings.key, key));
  return fresh;
}

// Push services want a way to reach whoever sends: the app's https address, or a mailto on its host.
export function readVapidSubject(environment: Environment) {
  try {
    const url = new URL(resolveAppUrl(environment));
    return url.protocol === "https:" ? url.origin : `mailto:alerts@${url.hostname}`;
  } catch {
    return "mailto:alerts@localhost";
  }
}
