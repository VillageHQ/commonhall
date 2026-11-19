import { eq } from "drizzle-orm";

import { user } from "../../platform/database/auth-schema.ts";
import type { Database } from "../../platform/database/client.ts";
import type { Environment } from "../../platform/environment.ts";
import { ROUTES } from "../../platform/http/routes.ts";
import { NOTIFICATION_KINDS } from "../../platform/notifications/contract.ts";
import { notifySoon } from "../../platform/notifications/notify.ts";
import { removeBidiControls } from "../../platform/text/safe-text.ts";

type NewMessage = { conversationId: string; senderId: string; recipientId: string };

// The alert beside the new-message email, after the message is saved. Never the words: a lock screen shows it.
export function alertNewMessage(database: Database, environment: Environment, { conversationId, senderId, recipientId }: NewMessage) {
  notifySoon(
    async () => {
      const [sender] = await database.select({ name: user.name }).from(user).where(eq(user.id, senderId));
      const name = removeBidiControls(sender?.name ?? "A member");
      return {
        userIds: [recipientId],
        kind: NOTIFICATION_KINDS.message,
        title: `Message from ${name}`,
        body: `${name} sent you a message. Open it to reply.`,
        url: `${ROUTES.messages}/${conversationId}`,
        fromUserId: senderId,
      };
    },
    { database, environment },
  );
}
