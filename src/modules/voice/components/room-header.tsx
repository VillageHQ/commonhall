"use client";

import "./voice.css";

import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, Ellipsis } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

import { VOICE_LIMITS, VOICE_PAGE } from "../contract";
import { voiceRequests } from "../queries";

// One item of the room's "More" sheet: what today's page offers there (Rename for the host, Leave when End room
// takes its place in the header, stepping down from the stage). With none, the header has no More: "Never recorded"
// sits in the line under the title (NEVER_RECORDED, contract.ts), so a listener's More would hold nothing.
export type RoomMoreItem = { label: string; onSelect: () => void; isDisabled?: boolean; testId?: string };

type RoomHeaderProps = {
  // The header's text button at the right: Leave, or End room for the host.
  end?: ReactNode;
  // Rename in the More sheet: the room and its title, for the host while the room is open.
  rename?: { roomId: string; title: string } | null;
  more?: RoomMoreItem[];
};

// The room's own header (X Spaces, Clubhouse): "‹ Rooms" at the left, then Leave (or End room) and "More". On a phone
// it replaces the community's bar (the page carries data-own-header) and sits under the status bar; from 1000 px the
// same row tops the room's column.
export function RoomHeader({ end, rename, more = [] }: RoomHeaderProps) {
  const hasMore = Boolean(rename) || more.length > 0;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  function close() {
    setIsMoreOpen(false);
    setIsRenaming(false);
  }
  return (
    <div className="vr-header" data-testid="room-header">
      <Link href={VOICE_PAGE} className="vr-header-back" data-testid="room-back">
        <ChevronLeft aria-hidden="true" strokeWidth={1.5} />
        Rooms
      </Link>
      <div className="vr-header-end">
        {end}
        {hasMore ? (
          <Sheet
            isOpen={isMoreOpen}
            onOpen={() => setIsMoreOpen(true)}
            onClose={close}
            title={isRenaming ? "Rename the room" : "More"}
            isTitleHidden={!isRenaming}
            desktop="popover"
            trigger={
              <button type="button" className="vr-iconbtn" aria-label="More" data-testid="room-more">
                <Ellipsis aria-hidden="true" strokeWidth={1.5} />
              </button>
            }
          >
            {isRenaming && rename ? (
              <RenameForm roomId={rename.roomId} title={rename.title} onDone={close} onCancel={() => setIsRenaming(false)} />
            ) : (
              <div className="vr-more" data-testid="room-more-sheet">
                {rename ? (
                  <button type="button" className="vr-more-item" onClick={() => setIsRenaming(true)} data-testid="rename-room">
                    Rename
                  </button>
                ) : null}
                {more.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="vr-more-item"
                    disabled={item.isDisabled}
                    data-testid={item.testId}
                    onClick={() => {
                      close();
                      item.onSelect();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </Sheet>
        ) : null}
      </div>
    </div>
  );
}

// The host's Rename: a one-tap room starts as "Sam's room", and the host names it here.
function RenameForm({ roomId, title, onDone, onCancel }: { roomId: string; title: string; onDone: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState(title);
  const rename = useMutation({
    mutationFn: () => voiceRequests.rename({ roomId, title: draft }),
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rename.mutate();
  }
  return (
    <form onSubmit={submit} className="vr-rename" aria-label="Rename the room" data-testid="rename-form">
      <Input aria-label="Room name" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={VOICE_LIMITS.titleLength} required autoFocus />
      {rename.error ? (
        <p className="fh-hint fh-err" role="alert">
          {rename.error.message}
        </p>
      ) : null}
      <div className="fh-btn-row">
        <Button type="submit" variant="ink" disabled={rename.isPending || !draft.trim()}>
          Save
        </Button>
        <Button type="button" variant="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// The room's title (22 px Newsreader, at most 3 lines) and its one quiet line under it.
export function RoomTitle({ title, line }: { title: string; line: ReactNode }) {
  return (
    <div className="vr-title-block">
      <h1 className="vr-title">{title}</h1>
      <p className="vr-subline" data-testid="room-subline">
        {line}
      </p>
    </div>
  );
}
