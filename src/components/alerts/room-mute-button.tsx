"use client";

import { useMutation } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import { useState } from "react";

import { useFlash } from "@/components/flash";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { NOTIFICATION_API_ROUTES } from "@/platform/notifications/contract";

// In a profile's "More" sheet (round 8; before, among the profile's buttons): "Don't notify me about Maya's rooms", a
// row with a switch showing its state. On, it mutes her room starts (Alerts › Muted people lists and undoes it); tapped
// again, it undoes it here. Her messages and intros still come.
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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isMuted}
      className="fh-person-menu-row"
      disabled={change.isPending}
      onClick={() => change.mutate(!isMuted)}
      data-testid="room-mute"
    >
      <BellOff aria-hidden="true" strokeWidth={1.5} />
      <span>{`Don’t notify me about ${firstName}’s rooms`}</span>
      <span aria-hidden="true" className="fh-person-switch" data-on={isMuted ? "" : undefined} />
    </button>
  );
}
