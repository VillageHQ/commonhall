import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ConversationList } from "@/modules/messages/components/conversation-list";
import { describeInboxLede } from "@/modules/messages/copy";
import { messagesManifest } from "@/modules/messages/manifest";
import { inboxQuery } from "@/modules/messages/queries";
import { readInbox } from "@/modules/messages/reads";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";
import { readChatAvailableAction } from "@/shell/chat-available";

export const metadata: Metadata = { title: PAGE_TITLES.messages };

// Commonhall's Inbox (inboxPage): the head, then one row per conversation, or the dashed empty state.
// With Rooms on, "I'm available to talk" sits 12 px under the lede (the head's 20 px margin, less 8), like a conversation's.
export default modulePage(messagesManifest, async function InboxPage() {
  const member = await requireMember();
  const database = getDatabase();
  const [firstPage, community, availableAction] = await Promise.all([
    readInbox(database, member.id, { search: "", cursor: null }),
    readBrandingForPage(),
    readChatAvailableAction(database, process.env, member.id),
  ]);
  const queryClient = new QueryClient();
  queryClient.setQueryData(inboxQuery().queryKey, { pages: [firstPage], pageParams: [null] });

  return (
    <>
      <PageHeader title="Inbox" description={describeInboxLede(community.name)} />
      {availableAction ? <div className="-mt-2 mb-5">{availableAction}</div> : null}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ConversationList />
      </HydrationBoundary>
    </>
  );
});
