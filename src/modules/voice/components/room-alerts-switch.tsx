"use client";

import { useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { ROUTES } from "@/platform/http/routes";

import { voiceRequests } from "../queries";

// What the Rooms page knows of the member's alerts: room alerts on or off, all alerts off, and a pause or quiet time
// holding them now, in words ("Quiet until 18:00").
export type RoomAlertsState = { isOn: boolean; isAllOff: boolean; heldWords: string | null };

const ALERTS_HREF = `${ROUTES.alerts}?from=rooms`;

// Rooms' own "Room alerts" switch, the page's last row (56 px): a bell, "Room alerts" and the switch at the right;
// under the label a quiet link to Alerts for quiet times, which names a pause or quiet time holding alerts now. One
// tap, no page change (the same switch as on Alerts).
export function RoomAlertsSwitch({ state }: { state: RoomAlertsState }) {
  const [isOn, setIsOn] = useState(state.isOn);
  const save = useMutation({
    mutationFn: (next: boolean) => voiceRequests.roomAlerts({ isOn: next, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    onMutate: (next) => setIsOn(next),
    onError: (_error, next) => setIsOn(!next),
  });
  return (
    <div className="vr-alerts" data-testid="room-alerts">
      <Bell aria-hidden="true" className="vr-alerts-icon" strokeWidth={1.5} />
      <div className="vr-alerts-text">
        {state.isAllOff ? (
          <>
            <span className="vr-alerts-label">All your alerts are off</span>
            <Link href={ALERTS_HREF} className="fh-linkbtn vr-alerts-link">
              Alerts
            </Link>
          </>
        ) : (
          <>
            <label htmlFor="room-alerts" className="vr-alerts-label">
              Room alerts
            </label>
            <Link href={ALERTS_HREF} className="fh-linkbtn vr-alerts-link" data-testid="quiet-times-link">
              {state.heldWords ?? "Quiet times"}
            </Link>
          </>
        )}
      </div>
      {state.isAllOff ? null : <Switch id="room-alerts" checked={isOn} disabled={save.isPending} onCheckedChange={(next) => save.mutate(next)} />}
      {save.error ? (
        <p className="fh-hint fh-err w-full" role="alert">
          {save.error.message}
        </p>
      ) : null}
    </div>
  );
}
