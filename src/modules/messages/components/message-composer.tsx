"use client";

import { ArrowUp } from "lucide-react";
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type Ref } from "react";

import { FormError } from "@/components/form-error";
import { MESSAGE_LIMITS, messageBodySchema } from "@/modules/messages/contract";
import { COMPOSER_LABEL } from "@/modules/messages/copy";

const COUNTER_APPEARS_WITHIN = 200;
const COMPOSER_ID = "reply";
const COMPOSER_HINT_ID = "message-composer-hint";
const FINE_POINTER_QUERY = "(pointer: fine)";
// The box starts one line high (40 px) and grows to five lines (120 px), then scrolls.
const BOX_MAXIMUM_PX = 120;

// On the web Enter sends and Shift+Enter adds a line; on a phone Enter adds a line, as every messenger.
function sendOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  if (!window.matchMedia(FINE_POINTER_QUERY).matches) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

function keepFocusInField(event: { preventDefault: () => void }) {
  event.preventDefault();
}

// The box follows its words up to five lines.
function useGrowingBox(draft: string) {
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.style.height = "";
    const needed = box.scrollHeight;
    if (needed > 0) box.style.height = `${Math.min(needed, BOX_MAXIMUM_PX)}px`;
  }, [draft]);
  return boxRef;
}

function setRefs<T>(element: T, ...refs: (Ref<T> | undefined)[]) {
  for (const ref of refs) {
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  }
}

// initialDraft: words a link put in the box (Apply on a job: "I'd like to apply for …"), for the member to edit and send.
type MessageComposerProps = { peerName: string; inputRef?: Ref<HTMLTextAreaElement>; isBusy?: boolean; initialDraft?: string; onSend: (body: string) => void };

// The reply bar (round 8, ui-polish Part 3): a round box that grows to five lines and a round Send that waits for words,
// their bottoms on one line. The thread pins the bar to the foot of the screen.
export function MessageComposer({ peerName, inputRef, isBusy = false, initialDraft = "", onSend }: MessageComposerProps) {
  const [draft, setDraft] = useState(initialDraft);
  const boxRef = useGrowingBox(draft);
  const body = messageBodySchema.safeParse(draft);
  const charactersLeft = MESSAGE_LIMITS.bodyLength - draft.length;
  const isOverLimit = charactersLeft < 0;
  const hasWords = draft.trim().length > 0;

  return (
    <>
      <form
        aria-label={`Reply to ${peerName}`}
        className="ib-composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!body.success || isBusy) return;
          onSend(body.data);
          setDraft("");
        }}
      >
        <label htmlFor={COMPOSER_ID} className="sr-only">
          {COMPOSER_LABEL}
        </label>
        <textarea
          id={COMPOSER_ID}
          ref={(element) => setRefs(element, boxRef, inputRef)}
          rows={1}
          value={draft}
          placeholder={COMPOSER_LABEL}
          aria-describedby={COMPOSER_HINT_ID}
          aria-invalid={isOverLimit}
          className="ib-box"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={sendOnEnter}
        />
        <button type="submit" className="ib-send" aria-label="Send" disabled={!hasWords || isBusy} aria-busy={isBusy} onMouseDown={keepFocusInField}>
          <ArrowUp aria-hidden="true" strokeWidth={2} />
        </button>
      </form>
      <p id={COMPOSER_HINT_ID} className="sr-only">
        On a keyboard, Enter sends and Shift and Enter adds a line.
      </p>
      {isOverLimit ? <FormError message={`Keep your message under ${MESSAGE_LIMITS.bodyLength.toLocaleString("en-US")} characters.`} /> : null}
      {charactersLeft <= COUNTER_APPEARS_WITHIN ? (
        <p className="fh-hint ib-counter">{isOverLimit ? `${-charactersLeft} over` : `${charactersLeft} left`}</p>
      ) : null}
    </>
  );
}
