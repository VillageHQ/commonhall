"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetRow } from "@/components/ui/rows";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ANNOUNCEMENT_PAGE } from "@/modules/admin/contract-announcements";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { WEEKDAYS, type WeeklySchedule } from "@/platform/weekly-email/schedule";
import { SCHEDULE_SAVED_FLASH } from "@/shell/weekly-email-rules";

const messageSchema = z.object({ message: z.string() });
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
// The browser's own list of time zones, offered as the field is typed (a datalist shows nothing until then).
const TIME_ZONES = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];

// The weekly email's switch, day, hour and time zone (Announce). Saving lands back on Announce with "Saved."
export function WeeklyEmailScheduleForm({ isEnabled: savedEnabled, schedule }: { isEnabled: boolean; schedule: WeeklySchedule }) {
  const router = useRouter();
  const [isEnabled, setEnabled] = useState(savedEnabled);
  const [weekday, setWeekday] = useState(schedule.weekday);
  const [hour, setHour] = useState(schedule.hour);
  const [timeZone, setTimeZone] = useState(schedule.timeZone);
  const save = useMutation({
    mutationFn: async () => {
      if (!timeZone.trim()) throw new Error("Pick a time zone from the list.");
      return postRequest(API_ROUTES.adminWeeklyEmailSchedule, { isEnabled, weekday, hour, timeZone: timeZone.trim() }, messageSchema);
    },
    onSuccess: () => {
      router.replace(`${ANNOUNCEMENT_PAGE}?m=${SCHEDULE_SAVED_FLASH}`, { scroll: false });
      router.refresh();
      // "Saved." shows at the top of the page: bring it into view.
      window.scrollTo({ top: 0 });
    },
  });
  return (
    <form
      className="mt-3"
      aria-label="Weekly email schedule"
      onSubmit={(event) => {
        event.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      <SetRow htmlFor="a-digest" label="Send the weekly email" control={<Switch id="a-digest" checked={isEnabled} onCheckedChange={setEnabled} aria-label="Send the weekly email" />} />
      <div className="fh-pair mt-3">
        <div>
          <label className="fh-label fh-small" htmlFor="a-day">
            Day
          </label>
          <Select id="a-day" value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="fh-label fh-small" htmlFor="a-hour">
            Hour
          </label>
          <Select id="a-hour" value={hour} onChange={(event) => setHour(Number(event.target.value))}>
            {HOURS.map((value) => (
              <option key={value} value={value}>
                {String(value).padStart(2, "0")}:00
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="fh-field">
        <label className="fh-label fh-small" htmlFor="a-tz">
          Time zone
        </label>
        <Input id="a-tz" list="a-tz-list" value={timeZone} placeholder="Europe/London" autoComplete="off" onChange={(event) => setTimeZone(event.target.value)} />
        <datalist id="a-tz-list">
          {TIME_ZONES.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
      </div>
      <FormError message={save.error?.message ?? null} />
      <Button type="submit" size="sm" className="mt-3" disabled={save.isPending}>
        Save
      </Button>
    </form>
  );
}
