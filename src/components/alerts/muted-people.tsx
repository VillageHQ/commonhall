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

// "Mute broadcasts from…": a muted member's "I'm available" broadcasts never alert you; their messages and intros still do.
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
    <section className="fh-sheet" aria-labelledby="muted-title">
      <h2 id="muted-title" className="fh-h3">
        Muted broadcasts
      </h2>
      <p className="fh-small fh-muted mt-1">Their “I’m available” broadcasts won’t alert you. Their messages and intro asks still do.</p>
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
    </section>
  );
}
