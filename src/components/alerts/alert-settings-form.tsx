"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

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
  NOTIFICATION_API_ROUTES,
  NOTIFICATION_KIND_LABELS,
  type AlertPreferences,
  type NotificationKind,
} from "@/platform/notifications/contract";

type AlertSettingsFormProps = {
  preferences: AlertPreferences;
  // Only the kinds this community has switched on (no voice rooms row while voice rooms don't exist, say).
  kinds: readonly NotificationKind[];
  // Whether the member ever saved: until then, quiet hours show (and save) the browser's own time zone.
  isSaved: boolean;
};

// The browser's list, with UTC first (Chrome's list leaves it out) and the saved zone kept even if the list lacks it.
function readTimeZones(current: string) {
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return [...new Set(["UTC", current, ...zones])];
}

// Settings › Alerts: alerts on or off, each kind, and quiet hours (from, to, days, time zone). One Save.
export function AlertSettingsForm({ preferences, kinds, isSaved }: AlertSettingsFormProps) {
  const router = useRouter();
  const flash = useFlash();
  const [isOn, setIsOn] = useState(preferences.isOn);
  const [offKinds, setOffKinds] = useState<readonly NotificationKind[]>(preferences.offKinds);
  const [chosenQuiet, setQuiet] = useState(preferences.quietHours);
  const [isZoneChosen, setIsZoneChosen] = useState(isSaved);
  const isInBrowser = useIsInBrowser();
  const browserZone = isInBrowser ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const quiet = isZoneChosen || !browserZone ? chosenQuiet : { ...chosenQuiet, timeZone: browserZone };
  const timeZones = useMemo(() => readTimeZones(quiet.timeZone), [quiet.timeZone]);

  const save = useMutation({
    mutationFn: (body: AlertPreferences) => postRequest(NOTIFICATION_API_ROUTES.preferences, body, acknowledgedResponseSchema),
    onSuccess: ({ message }) => {
      flash(message);
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({ isOn, offKinds: [...offKinds], quietHours: quiet });
  }

  function toggleKind(kind: NotificationKind, isKindOn: boolean) {
    setOffKinds((current) => (isKindOn ? current.filter((entry) => entry !== kind) : [...current, kind]));
  }

  function toggleDay(day: number) {
    setQuiet((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((entry) => entry !== day) : [...current.days, day].toSorted() }));
  }

  return (
    <form className="fh-sheet" onSubmit={submit} aria-label="Alert settings">
      <SetRow
        htmlFor="alerts-on"
        label="Alerts"
        hint="Off means no alerts on any device. Email is set apart, under Email."
        control={<Switch id="alerts-on" checked={isOn} onCheckedChange={setIsOn} />}
      />
      <fieldset disabled={!isOn} className="contents">
        <h3 className="fh-h3 mt-4">What alerts you</h3>
        {kinds.map((kind) => (
          <SetRow
            key={kind}
            htmlFor={`alert-kind-${kind}`}
            label={NOTIFICATION_KIND_LABELS[kind]}
            control={<Switch id={`alert-kind-${kind}`} checked={!offKinds.includes(kind)} disabled={!isOn} onCheckedChange={(isKindOn) => toggleKind(kind, isKindOn)} />}
          />
        ))}
        <h3 className="fh-h3 mt-4">Quiet hours</h3>
        <SetRow
          htmlFor="quiet-on"
          label="Quiet hours"
          hint="Nothing alerts you in these hours. You still see everything when you open the app."
          control={<Switch id="quiet-on" checked={quiet.isOn} disabled={!isOn} onCheckedChange={(isQuietOn) => setQuiet((current) => ({ ...current, isOn: isQuietOn }))} />}
        />
        {quiet.isOn ? (
          <div className="grid gap-3 pt-2">
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-[14px]">
                From
                <Input type="time" value={quiet.from} required onChange={(event) => setQuiet((current) => ({ ...current, from: event.target.value }))} className="w-32" />
              </label>
              <label className="grid gap-1 text-[14px]">
                To
                <Input type="time" value={quiet.to} required onChange={(event) => setQuiet((current) => ({ ...current, to: event.target.value }))} className="w-32" />
              </label>
              <label className="grid min-w-[14rem] flex-1 gap-1 text-[14px]">
                Time zone
                <Select
                  value={quiet.timeZone}
                  onChange={(event) => {
                    const timeZone = event.target.value;
                    setIsZoneChosen(true);
                    setQuiet((current) => ({ ...current, timeZone }));
                  }}
                >
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div role="group" aria-label="Days" className="flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => (
                <button key={day} type="button" className="fh-chip" aria-pressed={quiet.days.includes(day)} onClick={() => toggleDay(day)}>
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
            <p className="fh-small fh-muted">An overnight spell belongs to the day it starts: Friday 22:00 to 07:00 covers Saturday morning.</p>
          </div>
        ) : null}
      </fieldset>
      <FormError message={save.error?.message ?? null} />
      <div className="fh-btn-row mt-3">
        <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
