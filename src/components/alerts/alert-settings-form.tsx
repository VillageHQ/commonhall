"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetRow } from "@/components/ui/rows";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import {
  ALL_DAYS,
  DAY_LABELS,
  DEFAULT_TIME_ZONE,
  isDirectKind,
  NOTIFICATION_API_ROUTES,
  NOTIFICATION_KIND_LABELS,
  QUIET_TIME_PRESETS,
  quietTimeSchema,
  type AlertPreferences,
  type NotificationKind,
  type QuietTime,
} from "@/platform/notifications/contract";
import { describeQuietTime, describeTimeZone } from "./alert-words";

type AlertSettingsFormProps = {
  preferences: AlertPreferences;
  // Only the kinds this community has switched on (no rooms rows while Rooms is off, say).
  kinds: readonly NotificationKind[];
};

const NEW_QUIET_TIME: QuietTime = { from: "09:00", to: "12:00", allDay: false, days: [1, 2, 3, 4, 5] };

// The browser's list, with UTC first (Chrome's list leaves it out) and the saved zone kept even if the list lacks it.
function readTimeZones(current: string) {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set([DEFAULT_TIME_ZONE, current, ...zones])];
}

function isSameQuietTime(first: QuietTime, second: QuietTime) {
  return first.allDay === second.allDay && (first.allDay || (first.from === second.from && first.to === second.to)) && first.days.toSorted().join() === second.days.toSorted().join();
}

// Alerts › Quiet times, Let through, What alerts you. Every change saves at once; a refused one (a fourth quiet
// time, say) shows its one line and goes back to what was saved.
export function AlertSettingsForm({ preferences, kinds }: AlertSettingsFormProps) {
  const router = useRouter();
  const flash = useFlash();
  const [chosen, setChosen] = useState(preferences);
  const saved = useRef(preferences);
  // The quiet time being edited: its index, or the list's length for a new one.
  const [editing, setEditing] = useState<{ index: number; quietTime: QuietTime } | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isZoneOpen, setIsZoneOpen] = useState(false);
  const isInBrowser = useIsInBrowser();
  // Until the member picks one, the default zone shows (and saves) as the browser's own.
  const browserZone = isInBrowser ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const current = chosen.timeZone === DEFAULT_TIME_ZONE && browserZone ? { ...chosen, timeZone: browserZone } : chosen;
  const timeZones = useMemo(() => (isZoneOpen ? readTimeZones(current.timeZone) : []), [isZoneOpen, current.timeZone]);

  const save = useMutation({
    scope: { id: "alert-settings" },
    mutationFn: (body: AlertPreferences) => postRequest(NOTIFICATION_API_ROUTES.preferences, body, acknowledgedResponseSchema).then((response) => ({ response, body })),
    onSuccess: ({ response, body }) => {
      saved.current = body;
      flash(response.message);
      router.refresh();
    },
    onError: () => setChosen(saved.current),
  });

  function change(next: Partial<AlertPreferences>) {
    const body = { ...current, ...next };
    setChosen(body);
    save.mutate(body);
  }

  function toggleKind(kind: NotificationKind, isKindOn: boolean) {
    change({ offKinds: isKindOn ? current.offKinds.filter((entry) => entry !== kind) : [...current.offKinds, kind] });
  }

  function finishEditing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const parsed = quietTimeSchema.safeParse(editing.quietTime);
    if (!parsed.success) {
      setEditError(parsed.error.issues[0]?.message ?? "Check the times and days.");
      return;
    }
    const quietTimes = [...current.quietTimes];
    quietTimes.splice(editing.index, 1, parsed.data);
    setEditing(null);
    setEditError(null);
    change({ quietTimes });
  }

  function editDay(day: number) {
    setEditing((open) => (open ? { ...open, quietTime: { ...open.quietTime, days: open.quietTime.days.includes(day) ? open.quietTime.days.filter((entry) => entry !== day) : [...open.quietTime.days, day].toSorted() } } : open));
  }

  function editField(fields: Partial<QuietTime>) {
    setEditing((open) => (open ? { ...open, quietTime: { ...open.quietTime, ...fields } } : open));
  }

  const presets = QUIET_TIME_PRESETS.filter(({ quietTime }) => !current.quietTimes.some((entry) => isSameQuietTime(entry, quietTime)));
  const groups = [
    { title: "Sent to me", kinds: kinds.filter(isDirectKind) },
    { title: "From the portfolio", kinds: kinds.filter((kind) => !isDirectKind(kind)) },
  ].filter((group) => group.kinds.length > 0);

  return (
    <>
      <section className="fh-sheet" aria-labelledby="quiet-title" data-testid="quiet-times">
        <h2 id="quiet-title" className="fh-h3">
          Quiet times
        </h2>
        <p className="fh-small fh-muted mt-1">
          {describeTimeZone(current.timeZone)}{" "}
          <button type="button" className="fh-linkbtn" aria-expanded={isZoneOpen} onClick={() => setIsZoneOpen((open) => !open)}>
            Change
          </button>
        </p>
        {isZoneOpen ? (
          <Select aria-label="Time zone" className="mt-2" value={current.timeZone} onChange={(event) => change({ timeZone: event.target.value })}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {describeTimeZone(zone)}
              </option>
            ))}
          </Select>
        ) : null}
        {current.quietTimes.length ? (
          <ul className="mt-2 grid" aria-label="Your quiet times">
            {current.quietTimes.map((quietTime, index) => (
              <li key={`${index}-${describeQuietTime(quietTime)}`} className="flex items-center justify-between gap-2 border-b border-[var(--rule)] py-2">
                <span>{describeQuietTime(quietTime)}</span>
                <span className="flex gap-1">
                  <Button type="button" variant="quiet" size="sm" onClick={() => setEditing({ index, quietTime })}>
                    Edit
                  </Button>
                  <Button type="button" variant="quiet" size="sm" disabled={save.isPending} onClick={() => change({ quietTimes: current.quietTimes.filter((_, at) => at !== index) })}>
                    Remove
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {editing ? (
          <form className="mt-3 grid gap-3" aria-label="Quiet time" onSubmit={finishEditing}>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-[14px]">
                From
                <Input type="time" value={editing.quietTime.from} disabled={editing.quietTime.allDay} required onChange={(event) => editField({ from: event.target.value })} className="w-32" />
              </label>
              <label className="grid gap-1 text-[14px]">
                To
                <Input type="time" value={editing.quietTime.to} disabled={editing.quietTime.allDay} required onChange={(event) => editField({ to: event.target.value })} className="w-32" />
              </label>
              <label className="flex items-center gap-2 pb-2 text-[14px]">
                <Switch checked={editing.quietTime.allDay} onCheckedChange={(allDay) => editField({ allDay })} aria-label="All day" />
                All day
              </label>
            </div>
            <div role="group" aria-label="Days" className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => (
                <button key={day} type="button" className="fh-chip" aria-pressed={editing.quietTime.days.includes(day)} onClick={() => editDay(day)}>
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
            <FormError message={editError} />
            <div className="fh-btn-row">
              <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
                Save
              </Button>
              <Button
                type="button"
                variant="quiet"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setEditError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="fh-btn-row mt-3" role="group" aria-label="Add a quiet time">
            {presets.map(({ label, quietTime }) => (
              <Button key={label} type="button" variant="secondary" size="sm" disabled={save.isPending} onClick={() => change({ quietTimes: [...current.quietTimes, { ...quietTime, days: [...quietTime.days] }] })}>
                {label}
              </Button>
            ))}
            <Button type="button" variant="quiet" size="sm" onClick={() => setEditing({ index: current.quietTimes.length, quietTime: NEW_QUIET_TIME })}>
              Custom
            </Button>
          </div>
        )}
        <div className="mt-3">
          <SetRow
            htmlFor="let-direct-through"
            label="Let through intro asks and messages to me"
            control={<Switch id="let-direct-through" checked={current.letDirectThrough} onCheckedChange={(letDirectThrough) => change({ letDirectThrough })} />}
          />
        </div>
        <FormError message={save.error?.message ?? null} />
      </section>

      <section className="fh-sheet" aria-labelledby="kinds-title">
        <h2 id="kinds-title" className="fh-h3">
          What alerts you
        </h2>
        <SetRow htmlFor="alerts-on" label="All alerts" control={<Switch id="alerts-on" checked={current.isOn} onCheckedChange={(isOn) => change({ isOn })} />} />
        <fieldset disabled={!current.isOn} className="contents">
          {groups.map((group) => (
            <div key={group.title} role="group" aria-label={group.title}>
              <h3 className="fh-small fh-muted mt-3">{group.title}</h3>
              {group.kinds.map((kind) => (
                <SetRow
                  key={kind}
                  htmlFor={`alert-kind-${kind}`}
                  label={NOTIFICATION_KIND_LABELS[kind]}
                  control={<Switch id={`alert-kind-${kind}`} checked={!current.offKinds.includes(kind)} disabled={!current.isOn} onCheckedChange={(isKindOn) => toggleKind(kind, isKindOn)} />}
                />
              ))}
            </div>
          ))}
        </fieldset>
      </section>
    </>
  );
}
