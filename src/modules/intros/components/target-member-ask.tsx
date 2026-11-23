"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { useFlash } from "@/components/flash";
import { Avatar } from "@/components/ui/avatar";
import { FormError } from "@/components/form-error";
import { ListRow } from "@/components/ui/list-row";
import { readFirstName } from "@/platform/design/avatar-identity";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { formatDayMonth } from "@/platform/text/format-date";

import { CONSENT_ANSWERS, targetMemberAnswerSchema, type IntroForTarget } from "../contract";

type Answer = typeof CONSENT_ANSWERS.yes | typeof CONSENT_ANSWERS.noThanks;

// INTRO-06: an intro waiting on a member because they are the person asked for. Round 8 (ui-polish Part 3): the shared
// ListRow, as on the Inbox and Today alike: who asks, the date, what it's about, and an outlined "Answer" under the
// text (Airbnb's "Complete booking"). Answer opens the emailed page's words in the row, and the member answers there:
// "Yes, introduce us" or "No thanks".
export function TargetMemberAsk({ intro, ago }: { intro: IntroForTarget; ago: string }) {
  const router = useRouter();
  const flash = useFlash();
  const answerId = useId();
  const [isAnswering, setIsAnswering] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const askerFirst = readFirstName(intro.requester.name);
  const answer = useMutation({
    mutationFn: (choice: Answer) => postRequest(API_ROUTES.introTargetAnswer, { introId: intro.id, answer: choice }, targetMemberAnswerSchema),
    onSuccess: (saved) => {
      const message =
        saved.isRepeat
          ? "Already answered. There’s nothing more to do."
          : saved.answer === CONSENT_ANSWERS.yes
            ? `You said yes. Check your email: we’ll introduce you and ${askerFirst} with one message.`
            : "Thanks for answering. Nobody is told why, and nothing more is sent about this.";
      // The row leaves the page on refresh (nothing waits on them any more), so the answer stays as the page's flash.
      setDone(message);
      flash(message);
      router.refresh();
    },
  });
  const below = done ? (
    <p className="fh-small" role="status">
      {done}
    </p>
  ) : isAnswering ? (
    <div id={answerId} className="grid w-full gap-2.5">
      <p className="fh-small fh-muted">{[intro.requester.headline, `Asked ${ago}. ${askerFirst} hears nothing unless you say yes.`].filter(Boolean).join(" · ")}</p>
      {intro.note ? <div className="fh-quote fh-notetext">{intro.note}</div> : null}
      <div className="fh-btn-row">
        <button type="button" className="fh-btn fh-btn-primary fh-btn-sm" autoFocus disabled={answer.isPending} onClick={() => answer.mutate(CONSENT_ANSWERS.yes)}>
          Yes, introduce us
        </button>
        <button type="button" className="fh-btn fh-btn-quiet fh-btn-sm" disabled={answer.isPending} onClick={() => answer.mutate(CONSENT_ANSWERS.noThanks)}>
          No thanks
        </button>
      </div>
      <FormError message={answer.error?.message ?? null} />
    </div>
  ) : (
    <button type="button" className="fh-btn fh-btn-secondary fh-btn-sm" aria-expanded={false} aria-controls={answerId} onClick={() => setIsAnswering(true)}>
      Answer
    </button>
  );
  return (
    <ListRow
      role="group"
      aria-label={`${intro.introducerName} would like to introduce you to ${intro.requester.name}`}
      data-slot="target-member-ask"
      face={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} sizePx={48} />}
      title={intro.requester.name}
      meta={formatDayMonth(intro.createdAt)}
      line={`${intro.introducerName} would like to introduce you`}
      below={below}
    />
  );
}
