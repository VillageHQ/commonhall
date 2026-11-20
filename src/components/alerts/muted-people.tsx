"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { NOTIFICATION_API_ROUTES } from "@/platform/notifications/contract";

type Person = { id: string; name: string };

// Muted people, folded: a muted member starting a room never alerts you; their messages and intros still do. A
// profile's "Don't notify me about <name>'s rooms" adds them here.
export function MutedPeople({ muted, members }: { muted: readonly Person[]; members: readonly Person[] }) {
  const router = useRouter();
  const flash = useFlash();
  const [chosen, setChosen] = useState("");
  const mutedIds = new Set(muted.map(({ id }) => id));
  const choices = members.filter(({ id }) => !mutedIds.has(id));
  const change = useMutation({
    mutationFn: (body: { userId: string; isMuted: boolean }) => postRequest(NOTIFICATION_API_ROUTES.mutes, body, acknowledgedResponseSchema),
    onSuccess: ({ message }) => {
      flash(message);
      setChosen("");
      router.refresh();
    },
  });

  return (
    <details className="fh-sheet" data-testid="muted-people">
      <summary className="fh-h3 cursor-pointer">Muted people{muted.length ? ` (${muted.length})` : ""}</summary>
      <p className="fh-small fh-muted mt-1">You won’t hear when they start a room.</p>
      {muted.length ? (
        <ul className="mt-3 grid gap-2">
          {muted.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3">
              <span>{person.name}</span>
              <Button type="button" variant="quiet" size="sm" disabled={change.isPending} onClick={() => change.mutate({ userId: person.id, isMuted: false })}>
                Unmute
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="fh-small mt-3">Nobody muted.</p>
      )}
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        aria-label="Mute someone"
        onSubmit={(event) => {
          event.preventDefault();
          if (chosen) change.mutate({ userId: chosen, isMuted: true });
        }}
      >
        <Select aria-label="Member to mute" value={chosen} onChange={(event) => setChosen(event.target.value)} className="min-w-0 flex-1">
          <option value="">Choose a member…</option>
          {choices.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" size="sm" disabled={!chosen || change.isPending}>
          Mute
        </Button>
      </form>
      <FormError message={change.error?.message ?? null} />
    </details>
  );
}
