import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { IntrosList, IntrosWaitingForYes } from "@/modules/intros/components/intros-list";
import { introsManifest } from "@/modules/intros/manifest";
import { readIntroBoard } from "@/modules/intros/reads";
import { readIntrosForTarget } from "@/modules/intros/reads-target-member";
import { membersManifest } from "@/modules/members/manifest";
import { ConversationList } from "@/modules/messages/components/conversation-list";
import { InboxPanes } from "@/modules/messages/components/inbox-panes";
import { messagesManifest } from "@/modules/messages/manifest";
import { inboxQuery } from "@/modules/messages/queries";
import { readInbox } from "@/modules/messages/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase, type Database } from "@/platform/database/client";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";

async function readIntros(database: Database, memberId: string) {
  const [board, forYou] = await Promise.all([readIntroBoard(database, memberId), readIntrosForTarget(database, memberId)]);
  return { board, forYou };
}

async function readConversations(database: Database, memberId: string) {
  const firstPage = await readInbox(database, memberId, { search: "", cursor: null });
  const queryClient = new QueryClient();
  queryClient.setQueryData(inboxQuery().queryKey, { pages: [firstPage], pageParams: [null] });
  return dehydrate(queryClient);
}

// The Inbox (round 6, a shell page; round 8's two panes): the list stays in this layout, so on the web it keeps its
// place beside the open thread (/inbox/<id>), and on a phone the thread is pushed over it. Under All: the intro asks
// waiting for your yes, then your conversations; under Intros (/inbox?show=intros, where /intros lands): the intros you
// asked for. Messages and Intros each fill their part while they're on; with both off there is no Inbox. Each page
// still guards itself (a layout doesn't re-render on navigation).
export default modulePage(membersManifest, async function InboxLayout({ children }: { children: ReactNode }) {
  const member = await requireMember();
  const database = getDatabase();
  const [isMessagesOn, isIntrosOn] = await Promise.all([isModuleEnabled(database, messagesManifest), isModuleEnabled(database, introsManifest)]);
  if (!isMessagesOn && !isIntrosOn) notFound();
  const [intros, conversations] = await Promise.all([isIntrosOn ? readIntros(database, member.id) : null, isMessagesOn ? readConversations(database, member.id) : null]);

  const allView = conversations ? (
    <>
      {intros ? <IntrosWaitingForYes board={intros.board} forYou={intros.forYou} /> : null}
      <HydrationBoundary state={conversations}>
        <ConversationList label={intros ? "Messages" : undefined} />
      </HydrationBoundary>
    </>
  ) : null;

  return (
    <InboxPanes
      head={<PageHeader title="Inbox" />}
      allView={allView}
      introsView={intros ? <IntrosList board={intros.board} forYou={intros.forYou} /> : null}
      hasFilter={isMessagesOn && isIntrosOn}
    >
      {children}
    </InboxPanes>
  );
});
