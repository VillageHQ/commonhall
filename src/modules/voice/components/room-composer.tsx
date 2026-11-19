"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/form-field";
import { useDebouncedValue } from "@/components/use-debounced-value";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented";

import { ROOM_ACCESS, toRoomHref, VOICE_LIMITS, type RoomAccess, type RoomPeople } from "../contract";
import { voiceRequests } from "../queries";

const WHEN = { now: "now", later: "later" } as const;
type When = (typeof WHEN)[keyof typeof WHEN];
const SEARCH_DELAY_MS = 250;

// Members to invite, picked by name.
export function PeoplePicker({ picked, onChange, label = "Invite" }: { picked: RoomPeople; onChange: (people: RoomPeople) => void; label?: string }) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const results = useQuery({ queryKey: ["voice", "people", debounced], queryFn: () => voiceRequests.people(debounced), enabled: debounced.length > 0 });
  const pickedIds = new Set(picked.map(({ id }) => id));
  const options = (results.data?.people ?? []).filter(({ id }) => !pickedIds.has(id));
  return (
    <Field htmlFor="room-people" label={label} hint="Only the people you invite can see and join this room.">
      <Input id="room-people" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a name" autoComplete="off" maxLength={VOICE_LIMITS.searchLength} />
      {debounced && options.length > 0 ? (
        <div className="vr-results" role="list">
          {options.map((person) => (
            <button
              key={person.id}
              type="button"
              role="listitem"
              className="vr-result"
              onClick={() => {
                onChange([...picked, person]);
                setSearch("");
              }}
            >
              <Avatar stableId={person.id} name={person.name} imageUrl={person.faceUrl} sizePx={28} />
              {person.name}
            </button>
          ))}
        </div>
      ) : null}
      {picked.length > 0 ? (
        <div className="vr-picked">
          {picked.map((person) => (
            <span key={person.id} className="fh-tag gap-1.5">
              {person.name}
              <button type="button" className="inline-grid place-items-center" aria-label={`Remove ${person.name}`} onClick={() => onChange(picked.filter(({ id }) => id !== person.id))}>
                <X aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

// Start a room now or schedule one: a title, when, and who may come in.
export function RoomComposer({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>(WHEN.now);
  const [at, setAt] = useState("");
  const [access, setAccess] = useState<RoomAccess>(ROOM_ACCESS.open);
  const [invitees, setInvitees] = useState<RoomPeople>([]);
  const create = useMutation({
    mutationFn: voiceRequests.create,
    onSuccess: ({ roomId }) => {
      if (when === WHEN.now) router.push(toRoomHref(roomId));
      else {
        onClose();
        router.refresh();
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({
      title,
      access,
      scheduledFor: when === WHEN.later && at ? new Date(at).toISOString() : null,
      inviteeIds: access === ROOM_ACCESS.invite ? invitees.map(({ id }) => id) : [],
    });
  }

  const needsTime = when === WHEN.later && !at;
  return (
    <Card className="fh-sheet vr-composer">
      <form onSubmit={submit}>
        <h2 className="type-h3">Start a room</h2>
        <Field htmlFor="room-title" label="What's it about?" className="fh-field">
          <Input id="room-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={VOICE_LIMITS.titleLength} placeholder="Pricing your first enterprise deal" required />
        </Field>
        <div className="fh-field">
          <span className="fh-label">When</span>
          <SegmentedControl label="When" segments={[{ value: WHEN.now, label: "Now" }, { value: WHEN.later, label: "Later" }]} value={when} onChange={setWhen} />
          {when === WHEN.later ? (
            <Field htmlFor="room-at" label="Starts at" className="mt-3">
              <Input id="room-at" type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} required />
            </Field>
          ) : null}
        </div>
        <div className="fh-field">
          <span className="fh-label">Who can come in</span>
          <SegmentedControl
            label="Who can come in"
            segments={[
              { value: ROOM_ACCESS.open, label: "Everyone in the community" },
              { value: ROOM_ACCESS.invite, label: "Invite only" },
            ]}
            value={access}
            onChange={setAccess}
          />
        </div>
        {access === ROOM_ACCESS.invite ? (
          <div className="fh-field">
            <PeoplePicker picked={invitees} onChange={setInvitees} />
          </div>
        ) : null}
        <p className="fh-hint">Rooms are never recorded. Chat in a room disappears when the room ends.</p>
        {create.error ? <p className="fh-hint fh-err" role="alert">{create.error.message}</p> : null}
        <div className="fh-btn-row mt-4">
          <Button type="submit" variant="ink" disabled={create.isPending || !title.trim() || needsTime}>
            {when === WHEN.now ? "Start the room" : "Schedule the room"}
          </Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
