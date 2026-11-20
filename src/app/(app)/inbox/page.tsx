import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { CHIP_CLASSES } from "@/components/ui/chip";
import { IntrosList, IntrosWaitingForYes } from "@/modules/intros/components/intros-list";
import { introsManifest } from "@/modules/intros/manifest";
import { readIntroBoard } from "@/modules/intros/reads";
import { readIntrosForTarget } from "@/modules/intros/reads-target-member";
import { membersManifest } from "@/modules/members/manifest";
import { ConversationList } from "@/modules/messages/components/conversation-list";
import { messagesManifest } from "@/modules/messages/manifest";
import { inboxQuery } from "@/modules/messages/queries";
import { readInbox } from "@/modules/messages/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase, type Database } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: "Inbox" };

const INTROS_FILTER = "intros";

type InboxPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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

function InboxFilter({ isIntros }: { isIntros: boolean }) {
  return (
    <nav aria-label="Show" className="fh-chips mb-4">
      <Link href={ROUTES.messages} aria-current={isIntros ? undefined : "page"} className={CHIP_CLASSES}>
        All
      </Link>
      <Link href={ROUTES.inboxIntros} aria-current={isIntros ? "page" : undefined} className={CHIP_CLASSES}>
        Intros
      </Link>
    </nav>
  );
}

// The Inbox (round 6, a shell page): the intro asks waiting for your yes on top, then your conversations. The Intros
// filter (/inbox?show=intros, where /intros lands) lists the intros you asked for. Messages and Intros each fill
// their part while they're on; with both off there is no Inbox.
export default modulePage(membersManifest, async function InboxPage({ searchParams }: InboxPageProps) {
  const member = await requireMember();
  const database = getDatabase();
  const [isMessagesOn, isIntrosOn] = await Promise.all([isModuleEnabled(database, messagesManifest), isModuleEnabled(database, introsManifest)]);
  if (!isMessagesOn && !isIntrosOn) notFound();
  const isIntrosView = isIntrosOn && (!isMessagesOn || (await searchParams).show === INTROS_FILTER);
  const [intros, conversations] = await Promise.all([
    isIntrosOn ? readIntros(database, member.id) : null,
    isMessagesOn && !isIntrosView ? readConversations(database, member.id) : null,
  ]);

  return (
    <>
      <PageHeader title="Inbox" />
      {isMessagesOn && isIntrosOn ? <InboxFilter isIntros={isIntrosView} /> : null}
      {intros && isIntrosView ? <IntrosList board={intros.board} forYou={intros.forYou} /> : null}
      {intros && !isIntrosView ? <IntrosWaitingForYes board={intros.board} forYou={intros.forYou} /> : null}
      {conversations ? (
        <section className="fh-section" aria-labelledby={isIntrosOn ? "inbox-messages" : undefined}>
          {/* With intros on, a heading keeps the messages apart from "Waiting on you" above them. */}
          {isIntrosOn ? (
            <div className="fh-section-head">
              <h2 id="inbox-messages" className="fh-h3">
                Messages
              </h2>
            </div>
          ) : null}
          <HydrationBoundary state={conversations}>
            <ConversationList />
          </HydrationBoundary>
        </section>
      ) : null}
    </>
  );
});
