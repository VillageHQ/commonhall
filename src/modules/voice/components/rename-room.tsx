"use client";

import { useMutation } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { VOICE_LIMITS } from "../contract";
import { voiceRequests } from "../queries";

// The host's Rename, under the room's title: a one-tap room starts as "Sam's room", and the host names it here.
export function RenameRoom({ roomId, title }: { roomId: string; title: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(title);
  const rename = useMutation({
    mutationFn: () => voiceRequests.rename({ roomId, title: draft }),
    onSuccess: () => {
      setIsOpen(false);
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    rename.mutate();
  }

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="sm"
        variant="quiet"
        onClick={() => {
          setDraft(title);
          setIsOpen(true);
        }}
        data-testid="rename-room"
      >
        <Pencil aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
        Rename
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2" aria-label="Rename the room" data-testid="rename-form">
      <Input aria-label="Room name" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={VOICE_LIMITS.titleLength} required autoFocus className="min-w-0 flex-1" />
      <Button type="submit" size="sm" variant="ink" disabled={rename.isPending || !draft.trim()}>
        Save
      </Button>
      <Button type="button" size="sm" variant="quiet" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      {rename.error ? (
        <p className="fh-hint fh-err w-full" role="alert">
          {rename.error.message}
        </p>
      ) : null}
    </form>
  );
}
