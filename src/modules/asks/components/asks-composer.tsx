"use client";

import { AtSign, Clock, Hand, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { RequestFailure, postRequest } from "@/platform/http/post-request";

import { ASK_API_ROUTES, ASK_ERROR_CODES, ASK_KINDS, ASK_LIMITS, ASKS_PAGE, createdAskSchema, describeAllowance, type AskAllowance, type AskKind } from "../contract";
import type { AskDraftParts } from "../rules-board-url";

import { useIsWide } from "./use-is-wide";

import "./asks.css";

// The member writing: their face and name head the composer.
export type ComposerMember = { id: string; name: string; image?: string | null };

type ComposerProps = { member: ComposerMember; allowance: AskAllowance; draft?: AskDraftParts | null; isComposing?: boolean };

// Post wakes up at two letters (spaces don't count).
const MIN_LETTERS = 2;
const TOOL_ICON = { "aria-hidden": true, className: "size-4", strokeWidth: 1.75 } as const;

const WORDS = {
  [ASK_KINDS.ask]: { title: "New ask", placeholder: "What do you need? Who, what, by when.", switchTo: "Post a win" },
  [ASK_KINDS.update]: { title: "New win", placeholder: "What went well? Share a win with the community.", switchTo: "Post an ask" },
} as const;

// The box grows with the text, so the sheet (not the box) scrolls.
function fitToText(box: HTMLTextAreaElement | null) {
  if (!box) return;
  box.style.height = "auto";
  box.style.height = `${box.scrollHeight}px`;
}

// On a phone the keyboard covers the bottom of the screen without resizing the page (iOS), so the open sheet stops at
// the keyboard's top and its toolbar sits right above it.
function useKeyboardInset(isOn: boolean) {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!isOn || !viewport) return;
    const root = document.documentElement;
    const update = () => {
      const covered = Math.max(0, Math.round(window.innerHeight - viewport.height - viewport.offsetTop));
      root.style.setProperty("--kb", `${covered}px`);
      if (covered > 0) root.setAttribute("data-keyboard", "");
      else root.removeAttribute("data-keyboard");
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--kb");
      root.removeAttribute("data-keyboard");
    };
  }, [isOn]);
}

function AllowanceLine({ allowance }: { allowance: AskAllowance }) {
  return (
    <span className="ak-allow">
      <span className="fh-pips" aria-hidden="true">
        {Array.from({ length: allowance.cap }, (_unused, position) => (
          <i key={position} className={position < allowance.left ? "fh-on" : undefined} />
        ))}
      </span>
      {describeAllowance(allowance)}
    </span>
  );
}

// "Ask the community…" (Facebook's prompt row): the member's face and a field-look button. It is a button, so the page
// behind never raises the keyboard; it opens the composer.
function PromptRow({ member, onOpen }: { member: ComposerMember; onOpen: () => void }) {
  return (
    <div className="ak-prompt" data-slot="ask-prompt">
      <Avatar stableId={member.id} name={member.name} imageUrl={member.image ?? null} sizePx={32} />
      <button type="button" className="ak-prompt-btn" aria-haspopup="dialog" onClick={onOpen}>
        Ask the community…
      </button>
    </div>
  );
}

// Posting (round 8, ui-polish Part 4): a prompt row opens one borderless box with Post. Under 1000 px it is a
// full-screen sheet (Cancel · New ask · Post, a toolbar of two chips at its foot), as LinkedIn, X and Threads; from
// 1000 px the row turns into the box in place, with Post at its bottom right. "Who to reach" opens the optional
// target fields under the text; "Post a win" switches to a win. A post lands on Asks › Open with the page's
// confirmation. `?compose=1`, `#compose` or a drafted ask (Find candidates) open it on arrival.
export function AsksComposer({ member, allowance, draft = null, isComposing = false }: ComposerProps) {
  const router = useRouter();
  const isWide = useIsWide();
  const boxRef = useRef<HTMLTextAreaElement>(null);
  // Arriving to compose: `?compose=1` (an old "Post an ask" link) or a drafted ask (Find candidates).
  const [isOpen, setIsOpen] = useState(isComposing || Boolean(draft?.body));
  const [kind, setKind] = useState<AskKind>(ASK_KINDS.ask);
  const [body, setBody] = useState(draft?.body ?? "");
  const [target, setTarget] = useState(draft?.target ?? "");
  const [company, setCompany] = useState("");
  const [isTargetOpen, setIsTargetOpen] = useState(Boolean(draft?.target));
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [error, setError] = useState<{ text: string; isCap: boolean } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isAsk = kind === ASK_KINDS.ask;
  const words = WORDS[kind];
  const canPost = body.replace(/\s/g, "").length >= MIN_LETTERS && !isPending;
  const isSheet = isOpen && !isWide;
  useKeyboardInset(isSheet);

  // An old `#compose` link opens it too, once the page is in the browser.
  useEffect(() => {
    if (window.location.hash !== "#compose") return;
    const frame = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // The box takes the focus as the composer opens (after the sheet's own first focus), and fits its text.
  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const box = boxRef.current;
      if (!box) return;
      fitToText(box);
      box.focus({ preventScroll: isWide ? false : true });
      box.setSelectionRange(box.value.length, box.value.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, isWide]);

  function reset() {
    setKind(ASK_KINDS.ask);
    setBody("");
    setTarget("");
    setCompany("");
    setIsTargetOpen(false);
    setError(null);
  }

  function close() {
    setIsDiscardOpen(false);
    setIsOpen(false);
    reset();
  }

  // Back to the text, with the focus (and a phone's keyboard) in the box once the small sheet has let go of it.
  function keepEditing() {
    setIsDiscardOpen(false);
    window.setTimeout(() => boxRef.current?.focus({ preventScroll: true }), 0);
  }

  // Cancel: an empty box just closes; with text it asks first.
  function cancel() {
    if (body.trim()) setIsDiscardOpen(true);
    else close();
  }

  async function post() {
    if (!canPost) return;
    setIsPending(true);
    setError(null);
    try {
      const { helperCount } = await postRequest(
        ASK_API_ROUTES.create,
        {
          title: body,
          kind,
          targetText: isAsk ? target : null,
          targetCompany: isAsk ? company : null,
          // A prefilled hiring request ("Find candidates") carries its category and its job.
          ...(draft?.category && isAsk ? { category: draft.category } : {}),
          ...(draft?.hiringJobId && isAsk ? { hiringJobId: draft.hiringJobId } : {}),
        },
        createdAskSchema,
      );
      setIsPending(false);
      close();
      router.push(`${ASKS_PAGE}?m=${isAsk ? (helperCount > 0 ? "posted" : "posted0") : "updated"}`);
      router.refresh();
    } catch (failure) {
      const isCap = failure instanceof RequestFailure && failure.code === ASK_ERROR_CODES.allowanceUsed;
      setError({ text: failure instanceof Error ? failure.message : "Something went wrong. Try again.", isCap });
      setIsPending(false);
    }
  }

  function onBoxKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // An ask is one line (the server joins lines): Enter posts it, as it always has.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void post();
    }
    // In place, Escape with an empty box folds it back into the prompt row.
    if (event.key === "Escape" && isWide && !body.trim()) {
      event.preventDefault();
      close();
    }
  }

  function switchKind() {
    setKind(isAsk ? ASK_KINDS.update : ASK_KINDS.ask);
    setError(null);
    boxRef.current?.focus();
  }

  const author = (
    <div className="ak-author">
      <Avatar stableId={member.id} name={member.name} imageUrl={member.image ?? null} sizePx={32} />
      <div>
        <b>{member.name}</b>
        {isAsk ? <AllowanceLine allowance={allowance} /> : null}
      </div>
    </div>
  );

  const fields: ReactNode = (
    <>
      <label className="fh-sr" htmlFor="p-body">
        {words.title}
      </label>
      <textarea
        ref={boxRef}
        id="p-body"
        name="body"
        rows={1}
        className="ak-box"
        value={body}
        maxLength={ASK_LIMITS.titleLength}
        placeholder={words.placeholder}
        enterKeyHint="send"
        aria-invalid={error && !error.isCap ? true : undefined}
        onChange={(event) => {
          setBody(event.currentTarget.value);
          fitToText(event.currentTarget);
        }}
        onKeyDown={onBoxKeyDown}
      />
      {isAsk && isTargetOpen ? (
        <div className="ak-target">
          <div>
            <label className="fh-label fh-small" htmlFor="p-target">
              A person or a role
            </label>
            <Input id="p-target" name="target" maxLength={ASK_LIMITS.targetLength} value={target} onChange={(event) => setTarget(event.currentTarget.value)} placeholder="e.g. Head of procurement at a US hospital" />
          </div>
          <div>
            <label className="fh-label fh-small" htmlFor="p-company">
              Company
            </label>
            <Input id="p-company" name="company" maxLength={ASK_LIMITS.companyLength} value={company} onChange={(event) => setCompany(event.currentTarget.value)} placeholder="e.g. Halcyon Health" />
          </div>
        </div>
      ) : null}
      {isAsk && draft?.hiringJobId ? (
        <p className="ak-note" data-slot="hiring-free">
          A hiring request for your job doesn’t use one of your weekly asks.
        </p>
      ) : null}
      {error ? (
        error.isCap ? (
          <div className="fh-note fh-needs ak-note" role="alert">
            <Clock aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />
            <span>{error.text}</span>
          </div>
        ) : (
          <p className="fh-hint fh-err" role="alert">
            {error.text}
          </p>
        )
      ) : null}
    </>
  );

  const chips = (
    <div className="ak-tools" role="group" aria-label="Add to your post">
      {isAsk ? (
        <button type="button" className="fh-chip ak-chip" aria-expanded={isTargetOpen} aria-controls="p-target" onClick={() => setIsTargetOpen(!isTargetOpen)}>
          <AtSign {...TOOL_ICON} />
          Who to reach
        </button>
      ) : null}
      <button type="button" className="fh-chip ak-chip" onClick={switchKind}>
        {isAsk ? <Trophy {...TOOL_ICON} /> : <Hand {...TOOL_ICON} />}
        {words.switchTo}
      </button>
    </div>
  );

  const discard = (
    <Sheet
      isOpen={isDiscardOpen}
      onClose={keepEditing}
      title={isAsk ? "Discard this ask?" : "Discard this win?"}
      headEnd={null}
      className="ak-discard"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={keepEditing}>
            Keep editing
          </Button>
          <Button type="button" variant="destructive" onClick={close}>
            Discard
          </Button>
        </>
      }
    >
      <p className="fh-small fh-muted">What you wrote won’t be kept.</p>
    </Sheet>
  );

  if (isOpen && isWide) {
    return (
      <form id="compose" className="ak-card" data-kind={kind} 
        onSubmit={(event) => {
          event.preventDefault();
          void post();
        }}
      >
        {author}
        {fields}
        <div className="ak-card-foot">
          {chips}
          <Button type="submit" disabled={!canPost} className="ak-post">
            Post
          </Button>
        </div>
        {discard}
      </form>
    );
  }

  return (
    <>
      <PromptRow member={member} onOpen={() => setIsOpen(true)} />
      <Sheet
        isOpen={isSheet}
        onClose={cancel}
        size="full"
        title={words.title}
        className="ak-sheet"
        headStart={
          <button type="button" className="ak-cancel" onClick={cancel}>
            Cancel
          </button>
        }
        headEnd={
          <Button type="button" size="sm" disabled={!canPost} onClick={() => void post()} className="ak-post">
            Post
          </Button>
        }
        footer={chips}
      >
        <div id="compose" data-kind={kind}>
          {author}
          {fields}
        </div>
      </Sheet>
      {discard}
    </>
  );
}
