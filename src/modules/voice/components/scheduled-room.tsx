"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { voiceRequests } from "../queries";
import { formatRoomTime } from "./rooms-board";

// A room that hasn't started: its time, "Remind me" for members, "Start now" for the host.
export function ScheduledRoom({ roomId, scheduledFor, isHost, hasReminder }: { roomId: string; scheduledFor: string | null; isHost: boolean; hasReminder: boolean }) {
  const router = useRouter();
  const [isReminding, setIsReminding] = useState(hasReminder);
  const start = useMutation({ mutationFn: () => voiceRequests.start(roomId), onSuccess: () => router.refresh() });
  const remind = useMutation({ mutationFn: (isOn: boolean) => voiceRequests.remind({ roomId, isOn }), onSuccess: (_result, isOn) => setIsReminding(isOn) });
  return (
    <div className="fh-sheet">
      <p className="fh-name">{scheduledFor ? `Starts ${formatRoomTime(scheduledFor)}` : "Starts soon"}</p>
      <div className="fh-btn-row mt-3">
        {isHost ? (
          <Button variant="ink" onClick={() => start.mutate()} disabled={start.isPending}>
            Start now
          </Button>
        ) : (
          <Button variant="secondary" aria-pressed={isReminding} onClick={() => remind.mutate(!isReminding)} disabled={remind.isPending}>
            {isReminding ? "Reminder on" : "Remind me"}
          </Button>
        )}
      </div>
      {start.error || remind.error ? <p className="fh-hint fh-err">{(start.error ?? remind.error)?.message}</p> : null}
    </div>
  );
}
