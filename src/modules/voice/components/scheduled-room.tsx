"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { toStartedRoomHref } from "../contract";
import { voiceRequests } from "../queries";
import { useRoomTimeFormat } from "./rooms-board";

const REFRESH_MS = 15_000;

// A room that hasn't started: its time, "Remind me" for members, "Start now" for the host (it alerts everyone).
export function ScheduledRoom({ roomId, scheduledFor, isHost, hasReminder }: { roomId: string; scheduledFor: string | null; isHost: boolean; hasReminder: boolean }) {
  const router = useRouter();
  // The page turns into the live room once the host starts it.
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);
  const [isReminding, setIsReminding] = useState(hasReminder);
  const formatTime = useRoomTimeFormat();
  // Started: the page turns into the live room (its address tells the host once when nobody was alerted).
  const start = useMutation({ mutationFn: () => voiceRequests.start(roomId), onSuccess: (started) => (started.isQuiet ? router.replace(toStartedRoomHref(started)) : router.refresh()) });
  const remind = useMutation({ mutationFn: (isOn: boolean) => voiceRequests.remind({ roomId, isOn }), onSuccess: (_result, isOn) => setIsReminding(isOn) });
  return (
    <div className="fh-sheet">
      <p className="fh-name">{scheduledFor ? `Starts ${formatTime(scheduledFor)}` : "Starts soon"}</p>
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
