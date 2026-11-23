"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";

import { FormError } from "@/components/form-error";
import type { ConversationPeer } from "@/modules/messages/contract";
import { NEW_THREAD_LINE } from "@/modules/messages/copy";
import { sendMessageRequest, startConversationRequest } from "@/modules/messages/queries";
import { ROUTES } from "@/platform/http/routes";

import { useFillHeight } from "./inbox-panes";
import { MessageComposer } from "./message-composer";
import { ThreadHeader, ThreadIntro, useComposerHeight } from "./thread";

type NewThreadProps = { member: { id: string; name: string; avatarUrl: string | null }; communityName: string; draft?: string };

// Commonhall's first message (`/messages/new?to=`): the thread with no messages yet, in the thread's own look. The first
// Send starts the conversation and opens it in the Inbox, so nobody gets an empty conversation from a click on Message.
export function NewThread({ member, communityName, draft }: NewThreadProps) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const cardRef = useFillHeight<HTMLDivElement>();
  useComposerHeight(barRef, sectionRef);
  const peer: ConversationPeer = { ...member, title: null, company: null, isAvailable: true };
  const send = useMutation({
    mutationFn: async (body: string) => {
      const { conversationId } = await startConversationRequest(member.id);
      await sendMessageRequest({ conversationId, clientKey: crypto.randomUUID(), body });
      return conversationId;
    },
    onSuccess: (conversationId) => router.replace(`${ROUTES.messages}/${conversationId}`),
  });

  return (
    <div ref={cardRef} className="ib-solo">
      <section ref={sectionRef} aria-label={`New message to ${member.name}`} className="ib-thread" data-pushed-screen data-own-header>
        <ThreadHeader peer={peer} conversationId={null} />
        <div className="ib-scroll">
          <ThreadIntro peer={peer} communityName={communityName} />
          <div className="ib-msgs">
            <p className="ib-empty-line">{NEW_THREAD_LINE}</p>
          </div>
        </div>
        <div ref={barRef} className="ib-compose">
          <MessageComposer peerName={member.name} isBusy={send.isPending || send.isSuccess} initialDraft={draft} onSend={(body) => send.mutate(body)} />
          {send.error ? <FormError message={send.error.message} /> : null}
        </div>
      </section>
    </div>
  );
}
