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
import { Switch } from "@/components/ui/switch";

import {
  describeNotifyReset,
  NOTIFY_AUDIENCE_LABELS,
  NOTIFY_AUDIENCES,
  NOTIFY_OFF,
  ROOM_ACCESS,
  toRoomHref,
  VOICE_LIMITS,
  type NotifyAllowance,
  type NotifyAudience,
  type NotifyChoice,
  type RoomAccess,
  type RoomPeople,
} from "../contract";
import { voiceRequests } from "../queries";

const WHEN = { now: "now", later: "later" } as const;
type When = (typeof WHEN)[keyof typeof WHEN];
const SEARCH_DELAY_MS = 250;
const RESET_FORMAT: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };

export function formatResetTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, RESET_FORMAT);
}

type PeoplePickerProps = { id: string; picked: RoomPeople; onChange: (people: RoomPeople) => void; label: string; hint?: string; max: number };

// Members picked by name: a room's invite list, or who to notify.
export function PeoplePicker({ id, picked, onChange, label, hint, max }: PeoplePickerProps) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const results = useQuery({ queryKey: ["voice", "people", debounced], queryFn: () => voiceRequests.people(debounced), enabled: debounced.length > 0 });
  const pickedIds = new Set(picked.map(({ id: personId }) => personId));
  const options = (results.data?.people ?? []).filter(({ id: personId }) => !pickedIds.has(personId));
  const isFull = picked.length >= max;
  return (
    <Field htmlFor={id} label={label} hint={hint}>
      <Input id={id} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Type a name" autoComplete="off" maxLength={VOICE_LIMITS.searchLength} disabled={isFull} />
      {debounced && options.length > 0 && !isFull ? (
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
              <button type="button" className="inline-grid place-items-center" aria-label={`Remove ${person.name}`} onClick={() => onChange(picked.filter(({ id: personId }) => personId !== person.id))}>
                <X aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </Field>
  );
}

type ComposerProps = { notify: NotifyAllowance & { choice: NotifyChoice }; onClose: () => void };

// Start a room: a title, Now or Schedule, who may come in, and "Notify others" (off the first time, then the last
// choice) with who: my followers, people I pick, or everyone.
export function RoomComposer({ notify, onClose }: ComposerProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState<When>(WHEN.now);
  const [at, setAt] = useState("");
  const [access, setAccess] = useState<RoomAccess>(ROOM_ACCESS.open);
  const [invitees, setInvitees] = useState<RoomPeople>([]);
  const isAtLimit = notify.left === 0;
  const [isNotifying, setIsNotifying] = useState(notify.choice !== NOTIFY_OFF && !isAtLimit);
  const [audience, setAudience] = useState<NotifyAudience>(notify.choice === NOTIFY_OFF ? NOTIFY_AUDIENCES.followers : notify.choice);
  const [notified, setNotified] = useState<RoomPeople>([]);
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
      notify: isNotifying ? { audience, memberIds: audience === NOTIFY_AUDIENCES.picked ? notified.map(({ id }) => id) : undefined } : null,
    });
  }

  const needsTime = when === WHEN.later && !at;
  const needsPick = isNotifying && audience === NOTIFY_AUDIENCES.picked && notified.length === 0;
  const resetLine = describeNotifyReset(notify, formatResetTime);
  return (
    <Card className="fh-sheet vr-composer">
      <form onSubmit={submit} data-testid="room-composer">
        <h2 className="type-h3">Start a room</h2>
        <Field htmlFor="room-title" label="What's it about?" className="fh-field">
          <Input id="room-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={VOICE_LIMITS.titleLength} placeholder="Pricing your first enterprise deal" required />
        </Field>
        <div className="fh-field">
          <span className="fh-label">When</span>
          <SegmentedControl label="When" segments={[{ value: WHEN.now, label: "Now" }, { value: WHEN.later, label: "Schedule" }]} value={when} onChange={setWhen} />
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
              { value: ROOM_ACCESS.open, label: "Everyone" },
              { value: ROOM_ACCESS.invite, label: "Invite only" },
            ]}
            value={access}
            onChange={setAccess}
          />
        </div>
        {access === ROOM_ACCESS.invite ? (
          <div className="fh-field">
            <PeoplePicker id="room-invitees" picked={invitees} onChange={setInvitees} label="Invite" max={VOICE_LIMITS.inviteesPerRoom} />
          </div>
        ) : null}
        <div className="fh-field">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="room-notify" className="fh-label mb-0">
              Notify others
            </label>
            <Switch id="room-notify" checked={isNotifying} onCheckedChange={setIsNotifying} disabled={isAtLimit} />
          </div>
          {resetLine ? <p className="fh-hint">{resetLine}</p> : null}
          {isNotifying ? (
            <SegmentedControl
              label="Who to notify"
              className="mt-2"
              segments={[NOTIFY_AUDIENCES.followers, NOTIFY_AUDIENCES.picked, NOTIFY_AUDIENCES.everyone].map((value) => ({ value, label: NOTIFY_AUDIENCE_LABELS[value] }))}
              value={audience}
              onChange={setAudience}
            />
          ) : null}
          {isNotifying && audience === NOTIFY_AUDIENCES.picked ? (
            <div className="mt-3">
              <PeoplePicker id="room-notify-people" picked={notified} onChange={setNotified} label="Who to notify" max={VOICE_LIMITS.pickedOnStart} />
            </div>
          ) : null}
        </div>
        {create.error ? (
          <p className="fh-hint fh-err" role="alert">
            {create.error.message}
          </p>
        ) : null}
        <div className="fh-btn-row mt-4">
          <Button type="submit" variant="ink" disabled={create.isPending || !title.trim() || needsTime || needsPick}>
            {when === WHEN.now ? "Start" : "Schedule"}
          </Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
