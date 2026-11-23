"use client";

import { useQuery, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Ban, ChevronLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";

import { ConfirmAction } from "@/components/confirm-action";
import { FormError } from "@/components/form-error";
import { QueryBoundary } from "@/components/query-boundary";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { usePageVisible } from "@/components/use-page-visible";
import { describeBlock } from "@/modules/members/contract-blocks";
import type { ConversationPeer, ThreadPage } from "@/modules/messages/contract";
import { describeThreadLine, NEW_THREAD_LINE } from "@/modules/messages/copy";
import { pendingMessagesQuery, threadChangesQuery, threadQuery } from "@/modules/messages/queries";
import { readThreadMessages } from "@/modules/messages/rules-thread-cache";
import { buildThreadEntries, describeNewMessages, readNewestPeerSequence, type ThreadEntry } from "@/modules/messages/rules-thread-entries";
import { readFirstName } from "@/platform/design/avatar-identity";
import { RequestFailure } from "@/platform/http/post-request";
import { ROUTES } from "@/platform/http/routes";

import { formatDayDivider } from "./inbox-time";
import { MessageComposer } from "./message-composer";
import { MessageRow, type ThreadSender } from "./message-row";
import { requestInboxFocus, takeThreadFocusRequest, THREAD_FOCUS_TARGETS } from "./thread-focus";
import { useBrowserTimeZone } from "./use-browser-time-zone";
import { useDiscardFailedMessage, useMarkRead, useSendMessage, useSetBlock } from "./use-message-mutations";

const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;
// Messages from one sender within this long run together under one name.
const RUN_GAP_MS = 10 * 60 * 1000;
// The width from which the thread is the web's right pane and scrolls inside it.
const WIDE_QUERY = "(min-width: 1000px)";
// A new message from the other member scrolls into view when the reader was this close to the newest.
const NEAR_NEWEST_PX = 240;
export const YOU: ThreadSender = { id: "you", name: "You", avatarUrl: null };

const POLL_FAILURE_EXITS: Partial<Record<number, string>> = {
  [UNAUTHORIZED_STATUS]: ROUTES.signIn,
  [NOT_FOUND_STATUS]: ROUTES.messages,
};

function readPollFailureExit(error: Error | null) {
  return error instanceof RequestFailure ? POLL_FAILURE_EXITS[error.status] : undefined;
}

function NewMessageAnnouncer({ page, messages }: { page: ThreadPage; messages: ThreadPage["messages"] }) {
  const newestPeerSequence = readNewestPeerSequence(messages);
  const [announced, setAnnounced] = useState({ sequence: newestPeerSequence, text: "" });
  if (newestPeerSequence > announced.sequence) {
    setAnnounced({ sequence: newestPeerSequence, text: describeNewMessages(messages, announced.sequence, page.peer.name) });
  }
  return (
    <div role="status" aria-live="polite" data-slot="new-message-announcer" className="sr-only">
      {announced.text}
    </div>
  );
}

function ComposerReplacement({ peerName, isBlockedByMe, isUnblocking, onUnblock }: { peerName: string; isBlockedByMe: boolean; isUnblocking: boolean; onUnblock: () => void }) {
  const firstName = readFirstName(peerName);
  if (!isBlockedByMe) {
    return <p className="ib-replaced">{`${firstName} isn't available right now, so you can't send messages here.`}</p>;
  }
  return (
    <div className="ib-replaced flex flex-wrap items-center justify-between gap-3">
      <span className="min-w-0 flex-[1_1_220px]">{`You blocked ${firstName}. They haven't been told, and nothing they send reaches you.`}</span>
      <Button type="button" variant="secondary" size="sm" disabled={isUnblocking} onClick={onUnblock}>
        {`Unblock ${firstName}`}
      </Button>
    </div>
  );
}

function createClientKey() {
  return crypto.randomUUID();
}

function usePollFailureExit(error: Error | null) {
  const exit = readPollFailureExit(error);
  useEffect(() => {
    if (exit) window.location.assign(exit);
  }, [exit]);
}

// "Founder, Kindling": their title and company, as their profile shows them.
export function readPeerLine({ title, company }: Pick<ConversationPeer, "title" | "company">) {
  return [title, company].filter(Boolean).join(", ");
}

// On a phone the page scrolls; on the web the thread's own pane does.
function readScroller(pane: HTMLElement | null) {
  const isWide = typeof window.matchMedia === "function" && window.matchMedia(WIDE_QUERY).matches;
  return isWide ? pane : (document.scrollingElement as HTMLElement | null);
}

function scrollToNewest(pane: HTMLElement | null) {
  const scroller = readScroller(pane);
  if (scroller) scroller.scrollTop = scroller.scrollHeight;
}

function isNearNewest(pane: HTMLElement | null) {
  const scroller = readScroller(pane);
  return !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < NEAR_NEWEST_PX;
}

// The bar's height, so the last message clears the composer pinned over the page's foot.
function useComposerHeight(barRef: RefObject<HTMLElement | null>, sectionRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const bar = barRef.current;
    const section = sectionRef.current;
    if (!bar || !section || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => section.style.setProperty("--ib-compose-h", `${bar.offsetHeight}px`));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [barRef, sectionRef]);
}

// A run of messages starts at a new day, a new sender, or after a pause.
function startsRun(entry: ThreadEntry, previous: ThreadEntry | undefined) {
  if (!previous || entry.dayLabel !== null || previous.isMine !== entry.isMine) return true;
  return new Date(entry.createdAt).getTime() - new Date(previous.createdAt).getTime() > RUN_GAP_MS;
}

type HeaderProps = {
  peer: ConversationPeer;
  conversationId: string | null;
  headingRef?: RefObject<HTMLHeadingElement | null>;
  more?: ReactNode;
};

// The thread's own header (52 px under the status bar): back to the Inbox, who you're talking to (one link to their
// profile), and More. The web's pane keeps no back button.
export function ThreadHeader({ peer, conversationId, headingRef, more }: HeaderProps) {
  const line = readPeerLine(peer);
  const who = (
    <>
      <Avatar stableId={peer.id} name={peer.name} imageUrl={peer.avatarUrl} sizePx={32} />
      <span className="ib-who-text">
        <h1 ref={headingRef} tabIndex={-1} className="ib-who-name">
          {peer.name}
        </h1>
        {line ? <span className="ib-who-line">{line}</span> : null}
      </span>
    </>
  );
  return (
    <header className="ib-thead">
      <Link href={ROUTES.messages} className="ib-back" onClick={() => (conversationId ? requestInboxFocus(conversationId) : undefined)}>
        <ChevronLeft aria-hidden="true" strokeWidth={1.75} />
        <span>Inbox</span>
      </Link>
      {peer.isAvailable ? (
        <Link href={`${ROUTES.people}/${peer.id}`} className="ib-who">
          {who}
        </Link>
      ) : (
        <div className="ib-who">{who}</div>
      )}
      {more ?? <span className="ib-thead-end" />}
    </header>
  );
}

// The top of a conversation (Instagram's): who they are, their profile, and where replies land.
export function ThreadIntro({ peer, communityName }: { peer: ConversationPeer; communityName: string }) {
  const line = readPeerLine(peer);
  return (
    <div className="ib-intro">
      <Avatar stableId={peer.id} name={peer.name} imageUrl={peer.avatarUrl} sizePx={64} />
      <h2 className="ib-intro-name">{peer.name}</h2>
      {line ? <p className="ib-intro-line">{line}</p> : null}
      {peer.isAvailable ? (
        <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={`${ROUTES.people}/${peer.id}`}>
          View profile
        </Link>
      ) : null}
      <p className="ib-intro-note">{describeThreadLine(communityName)}</p>
    </div>
  );
}

type MoreProps = { peer: ConversationPeer; isBlocking: boolean; blockError: string | null; onBlock: (onDone: () => void) => void };

// More (…): a sheet with the thread's one action, "Block <name>", and its confirmation.
function ThreadMore({ peer, isBlocking, blockError, onBlock }: MoreProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const close = () => {
    setIsOpen(false);
    setIsConfirming(false);
  };
  return (
    <Sheet
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={close}
      title={peer.name}
      desktop="popover"
      trigger={
        <button type="button" className="ib-more" aria-label="More">
          <MoreHorizontal aria-hidden="true" strokeWidth={1.75} />
        </button>
      }
    >
      {isConfirming ? (
        <ConfirmAction
          message={`Block ${peer.name}? ${describeBlock(peer.name)}`}
          confirmLabel={`Block ${readFirstName(peer.name)}`}
          pendingLabel="Blocking…"
          cancelLabel="Never mind"
          isPending={isBlocking}
          errorMessage={blockError}
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => onBlock(close)}
        />
      ) : (
        <button type="button" className="ib-sheet-row" onClick={() => setIsConfirming(true)}>
          <Ban aria-hidden="true" strokeWidth={1.75} />
          {`Block ${peer.name}`}
        </button>
      )}
    </Sheet>
  );
}

// The thread (round 8, ui-polish Part 3): a pushed screen with its own header, the intro at the top, the messages as
// flat rows, and the reply bar pinned to the foot. On the web it fills the Inbox's right pane.
type ThreadProps = { conversationId: string; communityName: string; draft?: string; me?: ThreadSender };

function ThreadView({ conversationId, communityName, draft, me = YOU }: ThreadProps) {
  const thread = useSuspenseInfiniteQuery(threadQuery(conversationId));
  const changes = useQuery(threadChangesQuery(conversationId));
  const { data: pending } = useQuery(pendingMessagesQuery(conversationId));
  const timeZone = useBrowserTimeZone();
  const isVisible = usePageVisible();
  const [actionStatus, setActionStatus] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const send = useSendMessage(conversationId);
  const discardFailed = useDiscardFailedMessage(conversationId);
  const { mutate: markRead } = useMarkRead(conversationId);
  useComposerHeight(barRef, sectionRef);

  const [newestPage] = thread.data.pages;
  const peerMemberId = newestPage?.peer.id ?? "";
  const setBlock = useSetBlock(peerMemberId, conversationId);
  const messages = readThreadMessages(thread.data);
  const entries = buildThreadEntries({ messages, pending: pending ?? [], timeZone });
  const newestPeerSequence = readNewestPeerSequence(messages);
  const lastReadSequence = newestPage?.lastReadSequence ?? 0;
  const newestEntry = entries.at(-1);

  usePollFailureExit(changes.error);

  useEffect(() => {
    const target = takeThreadFocusRequest();
    if (target === THREAD_FOCUS_TARGETS.heading) headingRef.current?.focus({ preventScroll: true });
    if (target === THREAD_FOCUS_TARGETS.composer) composerRef.current?.focus({ preventScroll: true });
  }, []);

  // The thread opens at its newest message; a message you send, or one that arrives while you're at the newest,
  // scrolls into view.
  const newestKey = newestEntry?.key ?? null;
  const isNewestMine = newestEntry?.isMine ?? false;
  const hasOpened = useRef(false);
  useLayoutEffect(() => {
    if (!hasOpened.current || isNewestMine || isNearNewest(scrollRef.current)) {
      scrollToNewest(scrollRef.current);
      // Again once the bar's height and the faces have landed.
      requestAnimationFrame(() => scrollToNewest(scrollRef.current));
    }
    hasOpened.current = true;
  }, [newestKey, isNewestMine]);

  // Older messages load above the one being read, and it stays where it was. The browser may already hold it in
  // place (scroll anchoring), so only what it still moved is undone.
  const showOlder = async () => {
    if (thread.isFetchingNextPage) return;
    const scroller = readScroller(scrollRef.current);
    const anchor = scrollRef.current?.querySelector<HTMLElement>("[data-slot=message] .ib-msg-body");
    const topBefore = anchor?.getBoundingClientRect().top ?? 0;
    await thread.fetchNextPage();
    requestAnimationFrame(() => {
      if (scroller && anchor?.isConnected) scroller.scrollTop += anchor.getBoundingClientRect().top - topBefore;
    });
  };

  useEffect(() => {
    if (isVisible && newestPeerSequence > lastReadSequence) markRead(newestPeerSequence);
  }, [isVisible, newestPeerSequence, lastReadSequence, markRead]);

  if (!newestPage) return null;
  const { peer, isBlockedByMe } = newestPage;
  const canCompose = !isBlockedByMe && peer.isAvailable;
  const context = { conversationId, peer, me, timeZone, composerRef, onAnnounce: setActionStatus };
  const unblock = () => setBlock.mutate(false, { onSuccess: () => setActionStatus(`Unblocked ${peer.name}.`) });
  const block = (onDone: () => void) =>
    setBlock.mutate(true, {
      onSuccess: () => {
        onDone();
        setActionStatus(`Blocked ${peer.name}.`);
        headingRef.current?.focus();
      },
    });

  return (
    <section ref={sectionRef} aria-label={`Conversation with ${peer.name}`} className="ib-thread" data-pushed-screen data-own-header>
      <ThreadHeader
        peer={peer}
        conversationId={conversationId}
        headingRef={headingRef}
        more={canCompose ? <ThreadMore peer={peer} isBlocking={setBlock.isPending} blockError={setBlock.error?.message ?? null} onBlock={block} /> : undefined}
      />
      <div ref={scrollRef} className="ib-scroll">
        {thread.hasNextPage ? (
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className="ib-older"
            aria-busy={thread.isFetchingNextPage}
            onClick={() => void showOlder()}
          >
            {thread.isFetchingNextPage ? "Finding older messages…" : "Show older messages"}
          </Button>
        ) : (
          <ThreadIntro peer={peer} communityName={communityName} />
        )}
        {thread.isFetchNextPageError ? <FormError message={thread.error?.message ?? null} /> : null}
        <div role="group" aria-label={`Messages with ${peer.name}`} className="ib-msgs">
          {entries.length === 0 ? <p className="ib-empty-line">{NEW_THREAD_LINE}</p> : null}
          {entries.map((entry, position) => (
            <div key={entry.key} className="contents">
              {entry.dayLabel !== null ? (
                <p className="ib-day">
                  <span>{formatDayDivider(entry.createdAt, timeZone)}</span>
                </p>
              ) : null}
              <MessageRow
                entry={entry}
                isGroupStart={startsRun(entry, entries[position - 1])}
                context={context}
                onRetry={(clientKey, body) => send.mutate({ clientKey, body })}
                onDiscard={(clientKey) => {
                  discardFailed(clientKey);
                  composerRef.current?.focus();
                }}
              />
            </div>
          ))}
        </div>
        <NewMessageAnnouncer page={newestPage} messages={messages} />
        <div role="status" className="sr-only">
          {actionStatus}
        </div>
        {changes.isError && !readPollFailureExit(changes.error) ? (
          <p role="status" className="fh-hint mt-3">
            We can&apos;t reach the server right now. New messages will show up when it&apos;s back.
          </p>
        ) : null}
      </div>
      <div ref={barRef} className="ib-compose">
        {canCompose ? (
          <MessageComposer peerName={peer.name} inputRef={composerRef} initialDraft={draft} onSend={(body) => send.mutate({ clientKey: createClientKey(), body })} />
        ) : (
          <ComposerReplacement peerName={peer.name} isBlockedByMe={isBlockedByMe} isUnblocking={setBlock.isPending} onUnblock={unblock} />
        )}
        {setBlock.error && !canCompose ? <FormError message={setBlock.error.message} /> : null}
      </div>
    </section>
  );
}

export function Thread({ conversationId, communityName, draft, me }: ThreadProps) {
  return (
    <QueryBoundary loadingMessage="Opening your conversation…">
      <ThreadView key={conversationId} conversationId={conversationId} communityName={communityName} draft={draft} me={me} />
    </QueryBoundary>
  );
}

export { useComposerHeight };
