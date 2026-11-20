"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { toStartedRoomHref, VOICE_LIMITS } from "../contract";
import { VOICE_QUERY_KEYS, voiceRequests } from "../queries";

// Start a room: one tap starts it now as "<first name>'s room" and alerts everyone (the host renames it inside). A
// quiet "Schedule for later" opens the one form with choices left: a title and a time.
export function StartRoom({ isConfigured }: { isConfigured: boolean }) {
  const router = useRouter();
  const [isScheduling, setIsScheduling] = useState(false);
  // A quick second tap lands before the button greys out: only the first one starts.
  const isStarting = useRef(false);
  const start = useMutation({
    mutationFn: () => voiceRequests.create({}),
    onSuccess: (room) => router.push(toStartedRoomHref(room)),
    onError: () => {
      isStarting.current = false;
    },
  });
  function startNow() {
    if (isStarting.current) return;
    isStarting.current = true;
    start.mutate();
  }
  return (
    <div className="vr-start">
      <Button variant="ink" className="vr-start-button" onClick={startNow} disabled={!isConfigured || start.isPending} data-testid="start-room">
        Start a room
      </Button>
      <p className="fh-small fh-muted vr-start-note">
        Starts now and alerts everyone.{" "}
        <button type="button" className="fh-linkbtn" aria-expanded={isScheduling} onClick={() => setIsScheduling((value) => !value)} disabled={!isConfigured} data-testid="schedule-room">
          Schedule for later
        </button>
      </p>
      {start.error ? (
        <p className="fh-hint fh-err" role="alert">
          {start.error.message}
        </p>
      ) : null}
      {isScheduling ? <ScheduleRoom onClose={() => setIsScheduling(false)} /> : null}
    </div>
  );
}

// A room for later needs a title (nobody is in it yet to hear the host's name) and a time. It alerts everyone when
// the host starts it; members can tap Remind me meanwhile.
function ScheduleRoom({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [at, setAt] = useState("");
  const schedule = useMutation({
    mutationFn: () => voiceRequests.create({ title, scheduledFor: new Date(at).toISOString() }),
    onSuccess: async () => {
      // The list shows it at once, not at the next 15-second refresh.
      await queryClient.invalidateQueries({ queryKey: VOICE_QUERY_KEYS.rooms });
      onClose();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    schedule.mutate();
  }

  return (
    <Card className="fh-sheet vr-composer">
      <form onSubmit={submit} data-testid="schedule-form">
        <h2 className="type-h3">Schedule a room</h2>
        <Field htmlFor="room-title" label="What's it about?" className="fh-field">
          <Input id="room-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={VOICE_LIMITS.titleLength} placeholder="Pricing your first enterprise deal" required />
        </Field>
        <Field htmlFor="room-at" label="Starts at" className="fh-field">
          <Input id="room-at" type="datetime-local" value={at} onChange={(event) => setAt(event.target.value)} required />
        </Field>
        {schedule.error ? (
          <p className="fh-hint fh-err" role="alert">
            {schedule.error.message}
          </p>
        ) : null}
        <div className="fh-btn-row mt-4">
          <Button type="submit" variant="ink" disabled={schedule.isPending || !title.trim() || !at}>
            Schedule
          </Button>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
