"use client";

import { useMutation } from "@tanstack/react-query";
import { BellOff, Bell } from "lucide-react";
import { useState } from "react";

import { useFlash } from "@/components/flash";
import { Button } from "@/components/ui/button";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { NOTIFICATION_API_ROUTES } from "@/platform/notifications/contract";

// On a profile, where Follow was: "Don't notify me about Maya's rooms" mutes her room starts (Alerts › Muted people
// lists and undoes it); tapped again, "Notify me about Maya's rooms" undoes it here. Her messages and intros still come.
export function RoomMuteButton({ memberId, firstName, isMuted: initial }: { memberId: string; firstName: string; isMuted: boolean }) {
  const flash = useFlash();
  const [isMuted, setIsMuted] = useState(initial);
  const change = useMutation({
    mutationFn: (next: boolean) => postRequest(NOTIFICATION_API_ROUTES.mutes, { userId: memberId, isMuted: next }, acknowledgedResponseSchema),
    onSuccess: ({ message }, next) => {
      setIsMuted(next);
      flash(message);
    },
  });
  const Icon = isMuted ? Bell : BellOff;
  return (
    <Button type="button" size="sm" variant="quiet" aria-pressed={isMuted} disabled={change.isPending} onClick={() => change.mutate(!isMuted)} data-testid="room-mute">
      <Icon aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      {isMuted ? `Notify me about ${firstName}’s rooms` : `Don’t notify me about ${firstName}’s rooms`}
    </Button>
  );
}
