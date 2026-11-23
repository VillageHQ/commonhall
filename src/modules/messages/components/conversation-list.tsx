"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Inbox } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FormError } from "@/components/form-error";
import { QueryBoundary } from "@/components/query-boundary";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ListRow, SectionLabel } from "@/components/ui/list-row";
import { SearchBox } from "@/components/ui/search-box";
import { useDebouncedValue } from "@/components/use-debounced-value";
import { MESSAGE_LIMITS, type ConversationSummary, describeUnreadMessages } from "@/modules/messages/contract";
import { INBOX_EMPTY } from "@/modules/messages/copy";
import { inboxQuery } from "@/modules/messages/queries";
import { readInboxConversations } from "@/modules/messages/rules-thread-cache";
import { ROUTES } from "@/platform/http/routes";

import { formatRowTime } from "./inbox-time";
import { requestThreadFocus, takeInboxFocusRequest, THREAD_FOCUS_TARGETS, toConversationLinkId } from "./thread-focus";
import { useBrowserTimeZone } from "./use-browser-time-zone";

const SEARCH_INPUT_ID = "conversation-search";
const DELETED_PREVIEW = "Message deleted";
const OWN_PREFIX = "You: ";
const SEARCH_DEBOUNCE_MS = 250;
const NO_MATCH_MESSAGE = "Nobody matches that.";
const EMPTY_LINE = "Message someone from their profile, or ask for an intro.";

// The last line, starting "You: " when it is the member's own.
function readPreview({ preview, isDeleted, isMine }: ConversationSummary["lastMessage"]) {
  const text = isDeleted ? DELETED_PREVIEW : (preview ?? "").split("\n")[0] ?? "";
  return isMine && !isDeleted ? `${OWN_PREFIX}${text}` : text;
}

type ConversationRowProps = { summary: ConversationSummary; timeZone: string; isSelected: boolean };

// A conversation (round 8, ui-polish Part 3): the shared ListRow, with the name and the time on line 1, the last line
// under them, and the unread state (a dot, or the count when there are several).
function ConversationRow({ summary, timeZone, isSelected }: ConversationRowProps) {
  const { id, peer, lastMessage, unreadCount, isBlockedByMe } = summary;
  const hasUnread = unreadCount > 0;
  return (
    <ListRow
      data-conversation-row
      data-selected={isSelected ? "" : undefined}
      className="ib-row"
      face={<Avatar stableId={peer.id} name={peer.name} imageUrl={peer.avatarUrl} sizePx={48} />}
      title={
        <Link
          id={toConversationLinkId(id)}
          data-conversation-link
          href={`${ROUTES.messages}/${id}`}
          aria-current={isSelected ? "page" : undefined}
          onClick={() => requestThreadFocus(THREAD_FOCUS_TARGETS.heading)}
        >
          {peer.name}
          {hasUnread ? <span className="sr-only">, {describeUnreadMessages(unreadCount)}</span> : null}
        </Link>
      }
      meta={<time dateTime={lastMessage.createdAt}>{formatRowTime(lastMessage.createdAt, timeZone)}</time>}
      line={
        <>
          {isBlockedByMe ? "Blocked. " : null}
          {readPreview(lastMessage)}
        </>
      }
      isUnread={hasUnread}
      count={unreadCount}
    />
  );
}

// The empty Inbox: Part 1's EmptyState and one way on.
function NoConversations() {
  return (
    <EmptyState icon={Inbox} title={INBOX_EMPTY.title} description={EMPTY_LINE}>
      <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={ROUTES.people}>
        Find someone
      </Link>
    </EmptyState>
  );
}

function focusConversationAt(position: number) {
  document.querySelectorAll<HTMLElement>("[data-conversation-link]")[position]?.focus();
}

// The open conversation on the web's two panes (/inbox/<id>); none on /inbox.
function useOpenConversationId() {
  const params = useParams<{ conversationId?: string }>();
  return params?.conversationId ?? null;
}

function ConversationRows({ label }: { label?: string }) {
  const [search, setSearch] = useState("");
  const appliedSearch = useDeferredValue(useDebouncedValue(search, SEARCH_DEBOUNCE_MS));
  const inbox = useSuspenseInfiniteQuery(inboxQuery(appliedSearch.trim()));
  const conversations = readInboxConversations(inbox.data);
  const timeZone = useBrowserTimeZone();
  const openId = useOpenConversationId();
  const isSearching = Boolean(search.trim() || appliedSearch.trim());
  const hasNoMatch = conversations.length === 0 && isSearching;
  // Commonhall's inbox has no search. Community keeps it for a long inbox only: more than one page of conversations.
  const [isLong] = useState(inbox.hasNextPage);

  useEffect(() => {
    const conversationId = takeInboxFocusRequest();
    if (!conversationId) return;
    document.getElementById(toConversationLinkId(conversationId))?.focus();
  }, []);

  if (conversations.length === 0 && !isSearching) return <NoConversations />;

  return (
    <section aria-labelledby={label ? "inbox-messages" : undefined}>
      {label ? <SectionLabel id="inbox-messages">{label}</SectionLabel> : null}
      {isLong || isSearching ? (
        <div role="search" className="ib-search">
          <label htmlFor={SEARCH_INPUT_ID} className="sr-only">
            Search people
          </label>
          <SearchBox
            id={SEARCH_INPUT_ID}
            value={search}
            maxLength={MESSAGE_LIMITS.searchLength}
            placeholder="Search people"
            autoComplete="off"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      ) : null}
      <p role="status" className={cn("fh-small fh-muted mb-2", !hasNoMatch && "sr-only")}>
        {hasNoMatch ? NO_MATCH_MESSAGE : null}
      </p>
      {conversations.length > 0 ? (
        <div className="ib-rows" data-slot="conversation-rows">
          {conversations.map((summary) => (
            <ConversationRow key={summary.id} summary={summary} timeZone={timeZone} isSelected={summary.id === openId} />
          ))}
        </div>
      ) : null}
      {inbox.isFetchNextPageError ? <FormError message={inbox.error?.message ?? null} /> : null}
      {inbox.hasNextPage ? (
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="mt-3"
          aria-busy={inbox.isFetchingNextPage}
          onClick={async () => {
            if (inbox.isFetchingNextPage) return;
            await inbox.fetchNextPage();
            requestAnimationFrame(() => focusConversationAt(conversations.length));
          }}
        >
          {inbox.isFetchingNextPage ? "Finding more…" : "More"}
        </Button>
      ) : null}
    </section>
  );
}

// The Inbox list: the rows under their label ("Messages" while intros are on), or the empty state.
export function ConversationList({ label }: { label?: string }) {
  return (
    <QueryBoundary loadingMessage="Gathering your conversations…">
      <ConversationRows label={label} />
    </QueryBoundary>
  );
}
