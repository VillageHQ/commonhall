import { Bell, BellOff } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { readAlertState } from "@/platform/notifications/reads";
import { describeUntil } from "./alert-words";

// The bell on Rooms: this member's alerts in a few words ("Paused until 14:30", "Quiet until 18:00", "Alerts on" or
// "Alerts off"), opening Alerts, which returns here.
export async function AlertsBell({ memberId }: { memberId: string }) {
  const now = new Date();
  const { isOn, pausedUntil, quietUntil, timeZone } = await readAlertState(getDatabase(), memberId, now);
  const words = !isOn
    ? "Alerts off"
    : pausedUntil
      ? `Paused until ${describeUntil(pausedUntil, timeZone, now)}`
      : quietUntil
        ? `Quiet until ${describeUntil(quietUntil, timeZone, now)}`
        : "Alerts on";
  const Icon = isOn && !pausedUntil && !quietUntil ? Bell : BellOff;
  return (
    <p className="mb-4">
      <Link href={`${ROUTES.alerts}?from=rooms`} className={buttonVariants({ variant: "secondary", size: "sm" })} data-testid="alerts-bell">
        <Icon aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
        {words}
      </Link>
    </p>
  );
}
