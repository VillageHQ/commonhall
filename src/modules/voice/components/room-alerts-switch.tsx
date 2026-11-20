"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/platform/http/routes";

import { voiceRequests } from "../queries";

// What the Rooms page knows of the member's alerts: room alerts on or off, all alerts off, and a pause or quiet time
// holding them now, in words ("Quiet until 18:00").
export type RoomAlertsState = { isOn: boolean; isAllOff: boolean; heldWords: string | null };

const ALERTS_HREF = `${ROUTES.alerts}?from=rooms`;

// Rooms' own "Room alerts" switch: one tap, no page change (the same switch as on Alerts). Beside it, a quiet link to
// Alerts for quiet times, which names a pause or quiet time holding alerts now.
export function RoomAlertsSwitch({ state }: { state: RoomAlertsState }) {
  const [isOn, setIsOn] = useState(state.isOn);
  const save = useMutation({
    mutationFn: (next: boolean) => voiceRequests.roomAlerts({ isOn: next, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    onMutate: (next) => setIsOn(next),
    onError: (_error, next) => setIsOn(!next),
  });
  if (state.isAllOff) {
    return (
      <p className="vr-alerts fh-small fh-muted" data-testid="room-alerts">
        All your alerts are off.{" "}
        <Link href={ALERTS_HREF} className="fh-linkbtn">
          Alerts
        </Link>
      </p>
    );
  }
  return (
    <div className="vr-alerts" data-testid="room-alerts">
      <label htmlFor="room-alerts" className="vr-alerts-label">
        <Switch id="room-alerts" checked={isOn} disabled={save.isPending} onCheckedChange={(next) => save.mutate(next)} />
        {isOn ? "Room alerts on" : "Room alerts off"}
      </label>
      <Link href={ALERTS_HREF} className="fh-linkbtn" data-testid="quiet-times-link">
        {state.heldWords ?? "Quiet times"}
      </Link>
      {save.error ? (
        <p className="fh-hint fh-err w-full" role="alert">
          {save.error.message}
        </p>
      ) : null}
    </div>
  );
}
