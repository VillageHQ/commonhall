"use client";

import { Clock, Megaphone, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequestFailure, postRequest } from "@/platform/http/post-request";

import { ASK_API_ROUTES, ASK_ERROR_CODES, ASK_KINDS, ASK_LIMITS, ASKS_PAGE, createdAskSchema, describeAllowance, toAskPage, type AskAllowance, type AskKind } from "../contract";
import { ICON } from "./post-parts";

import type { AskDraftParts } from "../rules-board-url";

type ComposerProps = { allowance: AskAllowance; draft?: AskDraftParts | null; isComposing?: boolean };

// The box grows with the sentence, so a phone shows the whole ask while it's typed.
function fitToText(box: HTMLTextAreaElement | null) {
  if (!box) return;
  box.style.height = "auto";
  box.style.height = `${box.scrollHeight + 2}px`;
}

// The "What do you need?" box (round 7): it starts as an ask, one box and Post. Once something is typed, "Post a win
// instead", "Name who you’re trying to reach" (folded) and the week's allowance appear under it. `?compose=1` or
// `#compose` focuses it. A post goes to its own page with the flash.
export function AsksComposer({ allowance, draft = null, isComposing = false }: ComposerProps) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fitToText(bodyRef.current);
    if (!isComposing && window.location.hash !== "#compose") return;
    bodyRef.current?.focus();
    bodyRef.current?.scrollIntoView({ block: "center" });
  }, [isComposing]);
  // The extras appear with the first typed letter and stay until the post is made, so the fold keeps what was typed.
  const [hasText, setHasText] = useState(Boolean(draft?.body));
  const [error, setError] = useState<{ text: string; field: "body" | "cap" } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isCapUsed = allowance.left === 0;

  async function post(element: HTMLFormElement, kind: AskKind) {
    if (isPending) return;
    const form = new FormData(element);
    const isUpdate = kind === ASK_KINDS.update;
    setIsPending(true);
    setError(null);
    try {
      const { id, helperCount } = await postRequest(
        ASK_API_ROUTES.create,
        {
          title: String(form.get("body") ?? ""),
          kind,
          targetText: isUpdate ? null : String(form.get("target") ?? ""),
          targetCompany: isUpdate ? null : String(form.get("company") ?? ""),
          // A prefilled hiring request ("Find candidates") carries its category.
          ...(draft?.category && !isUpdate ? { category: draft.category } : {}),
        },
        createdAskSchema,
      );
      element.reset();
      setHasText(false);
      fitToText(bodyRef.current);
      setIsPending(false);
      router.push(isUpdate ? `${ASKS_PAGE}?m=updated` : `${toAskPage(id)}?m=${helperCount > 0 ? "posted" : "posted0"}`);
      router.refresh();
    } catch (failure) {
      const isCap = failure instanceof RequestFailure && failure.code === ASK_ERROR_CODES.allowanceUsed;
      setError({ text: failure instanceof Error ? failure.message : "Something went wrong. Try again.", field: isCap ? "cap" : "body" });
      setIsPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void post(event.currentTarget, ASK_KINDS.ask);
  }

  // A win (an update) is the same box, posted with one tap on the link under Post.
  function postWin(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (form?.reportValidity()) void post(form, ASK_KINDS.update);
  }

  return (
    <form method="post" className="fh-composer fh-sheet" id="compose" onSubmit={submit}>
      <div className="fh-oneline">
        <label className="fh-sr" htmlFor="p-body">
          What do you need?
        </label>
        <Textarea
          ref={bodyRef}
          id="p-body"
          name="body"
          rows={1}
          maxLength={ASK_LIMITS.titleLength}
          required
          defaultValue={draft?.body ?? ""}
          placeholder="What do you need?"
          className="fh-askbox"
          aria-invalid={error?.field === "body" ? true : undefined}
          onInput={(event) => {
            fitToText(event.currentTarget);
            if (event.currentTarget.value.trim()) setHasText(true);
          }}
          onKeyDown={(event) => {
            // An ask is one line: Enter posts it.
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={isPending}>
          Post
        </Button>
      </div>
      {error?.field === "body" ? (
        <p className="fh-hint fh-err" role="alert">
          {error.text}
        </p>
      ) : null}
      {hasText ? (
        <>
          <p className="fh-small fh-winline">
            <button type="button" className="fh-linkbtn" disabled={isPending} onClick={postWin}>
              <Megaphone {...ICON} />
              Post a win instead
            </button>
          </p>
          <details className="fh-more" open={Boolean(draft?.target) || undefined}>
            <summary>
              <Search {...ICON} />
              Name who you’re trying to reach
            </summary>
            <div className="fh-pair">
              <div>
                <label className="fh-label fh-small" htmlFor="p-target">
                  A person or a role
                </label>
                <Input id="p-target" name="target" maxLength={ASK_LIMITS.targetLength} defaultValue={draft?.target ?? ""} placeholder="e.g. Head of procurement at a US hospital" />
              </div>
              <div>
                <label className="fh-label fh-small" htmlFor="p-company">
                  Company
                </label>
                <Input id="p-company" name="company" maxLength={ASK_LIMITS.companyLength} placeholder="e.g. Halcyon Health" />
              </div>
            </div>
          </details>
        </>
      ) : null}
      {hasText || isCapUsed ? (
        <p className="fh-small fh-muted" style={{ marginTop: 10 }}>
          <span className="fh-pips">
            {Array.from({ length: allowance.cap }, (_unused, position) => (
              <i key={position} aria-hidden="true" className={position < allowance.left ? "fh-on" : undefined} />
            ))}
          </span>{" "}
          {describeAllowance(allowance)}
        </p>
      ) : null}
      {error?.field === "cap" ? (
        <div className="fh-note fh-needs" role="alert" style={{ marginTop: 10 }}>
          <Clock aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />
          <span>{error.text}</span>
        </div>
      ) : null}
    </form>
  );
}
