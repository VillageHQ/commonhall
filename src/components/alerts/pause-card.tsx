"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { postRequest } from "@/platform/http/post-request";
import { NOTIFICATION_API_ROUTES, PAUSE_CHOICES, type PauseBody } from "@/platform/notifications/contract";
import { describeUntil } from "./alert-words";

const pauseResponseSchema = z.object({ message: z.string(), pausedUntil: z.string().nullable() });

// Pause alerts: 1 hour · Until tomorrow (08:00 on the member's clock), or Resume while paused. Saves at once.
// `isSaved`: the member saved before; until then, the browser's zone goes along and becomes theirs (service.ts).
export function PauseCard({ pausedUntil, timeZone, isSaved }: { pausedUntil: string | null; timeZone: string; isSaved: boolean }) {
  const router = useRouter();
  const flash = useFlash();
  const pause = useMutation({
    mutationFn: (until: PauseBody["until"]) => {
      const browserZone = isSaved ? undefined : Intl.DateTimeFormat().resolvedOptions().timeZone;
      return postRequest(NOTIFICATION_API_ROUTES.pause, { until, timeZone: browserZone }, pauseResponseSchema);
    },
    onSuccess: ({ message }) => {
      flash(message);
      router.refresh();
    },
  });
  const now = new Date();
  const until = pausedUntil ? new Date(pausedUntil) : null;
  const isPaused = until !== null && until > now;

  return (
    <section className="fh-sheet" aria-labelledby="pause-title" data-testid="pause-card">
      <h2 id="pause-title" className="fh-h3">
        Pause alerts
      </h2>
      {isPaused ? (
        <p className="fh-small mt-1" role="status">
          Paused until {describeUntil(until, timeZone, now)}
        </p>
      ) : null}
      <div className="fh-btn-row mt-3">
        {isPaused ? (
          <Button type="button" variant="primary" size="sm" disabled={pause.isPending} onClick={() => pause.mutate(null)}>
            Resume
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" size="sm" disabled={pause.isPending} onClick={() => pause.mutate(PAUSE_CHOICES.hour)}>
              1 hour
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={pause.isPending} onClick={() => pause.mutate(PAUSE_CHOICES.tomorrow)}>
              Until tomorrow
            </Button>
          </>
        )}
      </div>
      <FormError message={pause.error?.message ?? null} />
    </section>
  );
}
