import { eq } from "drizzle-orm";

import { user } from "../../platform/database/auth-schema.ts";
import type { Database } from "../../platform/database/client.ts";
import type { Environment } from "../../platform/environment.ts";
import { ROUTES } from "../../platform/http/routes.ts";
import { NOTIFICATION_KINDS } from "../../platform/notifications/contract.ts";
import { notifySoon, type NotifyInput } from "../../platform/notifications/notify.ts";
import { removeBidiControls } from "../../platform/text/safe-text.ts";
import { introRequest } from "./schema.ts";

// Alerts beside the intro emails, sent after the change is saved. Never the note or a reason, and (like the emails)
// never whose no it was.

export const INTRO_ALERTS = {
  // To the connector: someone asked them for an intro.
  asked: "asked",
  // To the asker: the ask closed with a no (the connector's or the person's).
  closed: "closed",
  // To the asker and the connector: the person said yes.
  targetAgreed: "target_agreed",
} as const;

export type IntroAlert = (typeof INTRO_ALERTS)[keyof typeof INTRO_ALERTS];

async function readAlertFacts(database: Database, introId: string) {
  const [row] = await database
    .select({ requesterId: introRequest.requesterId, introducerId: introRequest.introducerId, targetName: introRequest.targetName, requesterName: user.name })
    .from(introRequest)
    .innerJoin(user, eq(user.id, introRequest.requesterId))
    .where(eq(introRequest.id, introId));
  return row ? { ...row, targetName: removeBidiControls(row.targetName), requesterName: removeBidiControls(row.requesterName) } : null;
}

type AlertFacts = NonNullable<Awaited<ReturnType<typeof readAlertFacts>>>;

const BUILDERS: Record<IntroAlert, (facts: AlertFacts, url: string) => NotifyInput> = {
  asked: ({ requesterId, introducerId, requesterName, targetName }, url) => ({
    userIds: [introducerId],
    kind: NOTIFICATION_KINDS.intro,
    title: `Intro ask from ${requesterName}`,
    body: `${requesterName} asked you for an intro to ${targetName}. Say yes or no.`,
    url,
    fromUserId: requesterId,
  }),
  closed: ({ requesterId, targetName }, url) => ({
    userIds: [requesterId],
    kind: NOTIFICATION_KINDS.answer,
    title: "Your intro ask closed",
    body: `The intro to ${targetName} won’t go ahead this time.`,
    url,
  }),
  target_agreed: ({ requesterId, introducerId, targetName }, url) => ({
    userIds: [requesterId, introducerId],
    kind: NOTIFICATION_KINDS.answer,
    title: `${targetName} said yes`,
    body: `${targetName} agreed to the intro. Look out for the email that joins you.`,
    url,
  }),
};

export function alertIntro(database: Database, environment: Environment, introId: string, alert: IntroAlert) {
  notifySoon(
    async () => {
      const facts = await readAlertFacts(database, introId);
      return facts ? BUILDERS[alert](facts, `${ROUTES.intros}/${introId}`) : null;
    },
    { database, environment },
  );
}
