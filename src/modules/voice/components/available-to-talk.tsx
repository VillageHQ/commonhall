"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { Button } from "@/components/ui/button";
import { RequestFailure } from "@/platform/http/post-request";

import { describeBroadcastsLeft, toRoomHref, VOICE_ERROR_CODES } from "../contract";
import { voiceRequests } from "../queries";

// "I'm available to talk": opens a room with the member as host (the alerts go out from the server), then opens it.
// The 3-a-day limit and its refusal words are the server's; `onRefused` lets the screen refresh its count.
export function useAvailableToTalk(onRefused: (error: Error) => void) {
  const router = useRouter();
  return useMutation({
    mutationFn: voiceRequests.available,
    onSuccess: ({ roomId }) => router.push(toRoomHref(roomId)),
    onError: onRefused,
  });
}

function isLimitRefusal(error: Error) {
  return error instanceof RequestFailure && error.code === VOICE_ERROR_CODES.broadcastLimit;
}

// The button in chat (the Inbox and a conversation), shown only while Rooms is on and LiveKit is set up.
export function AvailableToTalk({ initial }: { initial: { broadcastsLeft: number; isConfigured: boolean } }) {
  const [broadcastsLeft, setBroadcastsLeft] = useState(initial.broadcastsLeft);
  const available = useAvailableToTalk((error) => {
    if (isLimitRefusal(error)) setBroadcastsLeft(0);
  });
  if (!initial.isConfigured) return null;

  return (
    <div data-testid="available-to-talk" className="mt-3">
      <Button size="sm" variant="ink" onClick={() => available.mutate()} disabled={available.isPending || available.isSuccess || broadcastsLeft === 0}>
        I&rsquo;m available to talk
      </Button>
      <p className="fh-hint">{describeBroadcastsLeft(broadcastsLeft)}</p>
      {available.error ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          {available.error.message}
        </FlashNote>
      ) : null}
    </div>
  );
}
