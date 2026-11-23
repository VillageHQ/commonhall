"use client";

import { useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";

import { ConfirmAction } from "@/components/confirm-action";
import { ConfirmDelete } from "@/components/confirm-delete";
import { RICH_TEXT_TONES, RichText } from "@/components/rich-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ConversationPeer, DirectMessage } from "@/modules/messages/contract";
import { isFailed, isSending, type ThreadEntry } from "@/modules/messages/rules-thread-entries";
import { readFirstName } from "@/platform/design/avatar-identity";

import { formatClock, formatMessageMoment } from "./inbox-time";
import { useDeleteMessage, useReportMessage } from "./use-message-mutations";

const DELETED_LABEL = "Message deleted";
const BY_EMAIL = "by email";
const PANELS = { delete: "delete", report: "report" } as const;

type Panel = (typeof PANELS)[keyof typeof PANELS];

// Who wrote a message: the other member, or the reader (named "You" when the page doesn't pass their own name).
export type ThreadSender = { id: string; name: string; avatarUrl: string | null };

export type ThreadRowContext = {
  conversationId: string;
  peer: ConversationPeer;
  me: ThreadSender;
  timeZone: string;
  composerRef: RefObject<HTMLTextAreaElement | null>;
  onAnnounce: (status: string) => void;
};

type MessageProps = {
  entry: ThreadEntry;
  isGroupStart: boolean;
  context: ThreadRowContext;
  // The tapped message's own line: its moment, and Delete or Report.
  options?: { isOpen: boolean; onToggle: () => void; action?: ReactNode };
  hitRef?: RefObject<HTMLButtonElement | null>;
};

function readStatus(entry: ThreadEntry, message: DirectMessage | null) {
  if (isSending(entry)) return "Sending…";
  if (isFailed(entry)) return "Not sent";
  return message?.isReported ? "Reported" : null;
}

// A tap on the message's words opens its line; a tap on a link or a button inside it does what that does, and a
// selection of its words stays a selection.
function isTapOnWords(event: MouseEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement;
  if (target.closest("a, button, [data-message-options]")) return false;
  return !window.getSelection()?.toString();
}

// A message as a flat row (round 8, the council's decision 2: LinkedIn's thread, not bubbles). The first of a run
// carries the face, the name and the time; the rest of the run is the words alone, under the same name. A message is a
// button for the keyboard and screen readers (its sender and time), and a tap on it shows its own line.
function Message({ entry, isGroupStart, context, options, hitRef }: MessageProps) {
  const { peer, me, timeZone } = context;
  const sender = entry.isMine ? me : { id: peer.id, name: peer.name, avatarUrl: peer.avatarUrl };
  const clock = formatClock(entry.createdAt, timeZone);
  const status = readStatus(entry, entry.message);
  return (
    // The words stay a click target for the mouse and the finger; the button inside is the keyboard's way in.
    <div
      data-slot="message"
      data-mine={entry.isMine ? "" : undefined}
      data-group-start={isGroupStart ? "" : undefined}
      data-open={options?.isOpen ? "" : undefined}
      data-failed={isFailed(entry) ? "" : undefined}
      className="ib-msg"
      onClick={options ? (event) => isTapOnWords(event) && options.onToggle() : undefined}
    >
      {isGroupStart ? (
        <>
          <span className="ib-msg-face">
            <Avatar stableId={sender.id} name={sender.name} imageUrl={sender.avatarUrl} sizePx={36} />
          </span>
          <p className="ib-msg-head">
            <b>{sender.name}</b>
            <span aria-hidden="true"> · </span>
            <time dateTime={entry.createdAt}>{clock}</time>
          </p>
        </>
      ) : null}
      {options ? (
        <button ref={hitRef} type="button" className="ib-msg-hit" aria-label={`${sender.name}, ${formatMessageMoment(entry.createdAt, timeZone)}`} aria-expanded={options.isOpen} onClick={options.onToggle} />
      ) : null}
      <div className="ib-msg-body">
        {entry.body === null ? <p className="ib-msg-deleted">{DELETED_LABEL}</p> : <RichText text={entry.body} tone={RICH_TEXT_TONES.surface} />}
      </div>
      {entry.message?.isViaEmail || status ? (
        <p className="ib-msg-tags">
          {entry.message?.isViaEmail ? <span>{BY_EMAIL}</span> : null}
          {status ? <span data-status={status}>{status}</span> : null}
        </p>
      ) : null}
      {options?.isOpen ? (
        <div data-message-options className="ib-msg-meta">
          <time dateTime={entry.createdAt}>{formatMessageMoment(entry.createdAt, timeZone)}</time>
          {options.action}
        </div>
      ) : null}
    </div>
  );
}

type ActionPanelProps = { conversationId: string; message: DirectMessage; onCancel: () => void; onDone: (status: string) => void };

function DeletePanel({ conversationId, message, onCancel, onDone }: ActionPanelProps) {
  const deleteMessage = useDeleteMessage(conversationId);
  return (
    <ConfirmDelete
      message="Delete this message? You'll both see “Message deleted” instead."
      isPending={deleteMessage.isPending}
      errorMessage={deleteMessage.error?.message ?? null}
      onCancel={onCancel}
      onConfirm={() => deleteMessage.mutate(message.id, { onSuccess: () => onDone("Message deleted.") })}
    />
  );
}

function ReportPanel({ conversationId, message, onCancel, onDone }: ActionPanelProps) {
  const reportMessage = useReportMessage(conversationId, message);
  return (
    <ConfirmAction
      message="Report this message? It's saved for this community's admins. They'll be able to see this message, who sent it and that you reported it, and nothing else from this conversation."
      confirmLabel="Report"
      pendingLabel="Reporting…"
      cancelLabel="Keep it"
      isPending={reportMessage.isPending}
      errorMessage={reportMessage.error?.message ?? null}
      onCancel={onCancel}
      onConfirm={() => reportMessage.mutate(undefined, { onSuccess: () => onDone("Report saved for this community's admins.") })}
    />
  );
}

const ACTION_PANELS: Record<Panel, typeof DeletePanel> = { [PANELS.delete]: DeletePanel, [PANELS.report]: ReportPanel };

type RowProps = { entry: ThreadEntry; isGroupStart: boolean; context: ThreadRowContext };

function ConfirmedRow({ entry, message, isGroupStart, context }: RowProps & { message: DirectMessage }) {
  const { conversationId, peer, composerRef, onAnnounce } = context;
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const hitRef = useRef<HTMLButtonElement>(null);
  const hasActions = !message.isDeleted && !message.isReported;
  const ActionPanel = panel ? ACTION_PANELS[panel] : null;
  const label = message.isMine ? "Delete" : "Report";
  const action = hasActions ? (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      aria-label={`${label} ${message.isMine ? "your" : `${readFirstName(peer.name)}'s`} message`}
      onClick={() => setPanel(message.isMine ? PANELS.delete : PANELS.report)}
    >
      {label}
    </Button>
  ) : undefined;

  return (
    <>
      <Message
        entry={entry}
        isGroupStart={isGroupStart}
        context={context}
        hitRef={hitRef}
        options={{
          isOpen,
          action,
          onToggle: () => {
            setIsOpen((wasOpen) => !wasOpen);
            setPanel(null);
          },
        }}
      />
      {ActionPanel ? (
        <div className="ib-msg-panel">
          <ActionPanel
            conversationId={conversationId}
            message={message}
            onCancel={() => {
              setPanel(null);
              hitRef.current?.focus();
            }}
            onDone={(status) => {
              setPanel(null);
              setIsOpen(false);
              onAnnounce(status);
              composerRef.current?.focus();
            }}
          />
        </div>
      ) : null}
    </>
  );
}

type PendingRowProps = RowProps & {
  onRetry: (clientKey: string, body: string) => void;
  onDiscard: (clientKey: string) => void;
};

function PendingRow({ entry, isGroupStart, context, onRetry, onDiscard }: PendingRowProps) {
  const { pending } = entry;
  return (
    <>
      <Message entry={entry} isGroupStart={isGroupStart} context={context} />
      {pending && isFailed(entry) ? (
        <div className="ib-msg-panel">
          <p role="alert" className="fh-small text-ribbon">
            Not sent. {pending.failureMessage}
          </p>
          <div className="fh-btn-row mt-2">
            <Button type="button" size="sm" onClick={() => onRetry(pending.clientKey, pending.body)}>
              Try again
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => onDiscard(pending.clientKey)}>
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MessageRow({ entry, isGroupStart, context, onRetry, onDiscard }: PendingRowProps) {
  return entry.message ? (
    <ConfirmedRow entry={entry} message={entry.message} isGroupStart={isGroupStart} context={context} />
  ) : (
    <PendingRow entry={entry} isGroupStart={isGroupStart} context={context} onRetry={onRetry} onDiscard={onDiscard} />
  );
}
