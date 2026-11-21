"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Link2, Mail, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { Button, ButtonRow } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/checkbox-card";
import { Note } from "@/components/ui/note";
import { BULK_INVITE_FORMATS, MAXIMUM_LISTED_INVITES, parseInviteList, type BulkInviteResult } from "@/modules/members/contract-bulk-invites";
import { FILL_IN_BASES, type FillInBasis } from "@/modules/members/contract-fill-in";
import { PROFILE_LIMITS } from "@/modules/members/contract-profile";
import { readInviteWords } from "@/modules/members/contract-invite-email";
import { createBulkInvitesRequest } from "@/modules/members/queries-invites";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";

// The Mail page (Set up): the invite form links to it while mail is off.
const MAIL_PAGE = ROUTES.adminMail;

const EMPTY_MESSAGE = "Paste at least one email address.";
const TERMS_DATE_MESSAGE = "Pick the date your terms started saying this.";

type SentLink = BulkInviteResult["links"][number];

type Outcome = { isOk: boolean; summary: string; lines: string[]; links: SentLink[] };

function readOutcome(result: BulkInviteResult): Outcome {
  const invited = result.invitedCount + result.renewedCount;
  const lines = [...result.skipped.map(({ email, why }) => `${email}: ${why}`), ...result.problems.map(({ text, why }) => `${text}: ${why}`)];
  // Mail off: nothing went out, so the line says the links are ready to copy, not "invited".
  const done = result.isEmailOn ? `${invited} invited.` : invited === 1 ? "1 link ready: copy it and send it to that founder." : `${invited} links ready: copy each one and send it to that founder.`;
  const summary =
    invited > 0
      ? `${done}${lines.length ? ` ${lines.length} skipped:` : ""}`
      : lines.length
        ? `Nobody new to invite. ${lines.length} skipped:`
        : EMPTY_MESSAGE;
  return { isOk: invited > 0, summary, lines: lines.slice(0, 8), links: result.links };
}

// No line holds an email address: Commonhall's "Paste at least one email address." (a list over the limit goes to
// the server, which says so).
function isNothingToInvite(text: string) {
  if (!text.trim()) return true;
  try {
    const { people, skipped } = parseInviteList(text);
    return people.length + skipped.length === 0;
  } catch {
    return false;
  }
}

type Signature = { community: string; inviterName: string; inviterRole: string | null; isNetworkSearchOn: boolean };

function mailtoFor(link: SentLink, signature: Signature) {
  const words = readInviteWords({ community: signature.community, isNetworkSearchOn: signature.isNetworkSearchOn, inviteeName: link.name, inviterName: signature.inviterName, inviterRole: signature.inviterRole, apostrophe: "'" });
  const body = [words.hi, "", words.lead, "", `${words.how}:`, link.link, "", words.small, "", words.sign].join("\n");
  return `mailto:${encodeURIComponent(link.email).replace("%40", "@")}?subject=${encodeURIComponent(words.subject)}&body=${encodeURIComponent(body)}`;
}

const COPIED_RESET_MS = 2_000;

// Copies a text, and says "Copied" for a moment.
function CopyButton({ text, label, variant = "secondary" }: { text: string; label: string; variant?: "secondary" | "quiet" }) {
  const [wasCopied, setWasCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setWasCopied(true);
          setTimeout(() => setWasCopied(false), COPIED_RESET_MS);
        });
      }}
    >
      {wasCopied ? <Check aria-hidden="true" strokeWidth={1.5} /> : <Copy aria-hidden="true" strokeWidth={1.5} />}
      <span aria-live="polite">{wasCopied ? "Copied" : label}</span>
    </Button>
  );
}

// Round 7: right after the links are made, one row per founder with its own "Copy link" (never a link to read off
// the screen), and "Open in your email" as the second way: one ready mail with only their own link.
function SendYourself({ links, signature }: { links: SentLink[]; signature: Signature }) {
  const allLinks = links.map(({ email, link }) => `${email} ${link}`).join("\n");
  return (
    <div className="fh-copybox fh-sendself mt-3.5" data-testid="invite-links">
      <h3 className="fh-h3">{links.length === 1 ? "Their sign-in link" : `${links.length} sign-in links`}</h3>
      <p className="fh-hint mt-1 mb-2.5">Each link signs in as one founder: send it only to them. It works once, for 14 days.</p>
      <div className="fh-rows">
        {links.map((link) => (
          <div key={link.email} className="fh-r" data-invite-link={link.email}>
            {/* A phone gives the name and address this room (parts.css: the row's two columns). */}
            <span className="fh-avatar fh-sm inline-flex size-7 items-center justify-center rounded-full bg-vellum max-[480px]:hidden">
              <Mail aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
            </span>
            <div className="fh-who">
              {/* One line each, cut with "…" on a narrow phone, as on Commonhall: an address is never split mid-word. */}
              <b title={link.name || link.email}>{link.name || link.email}</b>
              {link.name ? <span title={link.email}>{link.email}</span> : null}
              {/* The second way, a small link under the person, so the row keeps its room for their name on a phone. */}
              <a className="fh-small underline decoration-1 underline-offset-[3px]" href={mailtoFor(link, signature)}>
                Open in your email
              </a>
            </div>
            <div className="fh-end">
              <CopyButton text={link.link} label="Copy" />
            </div>
          </div>
        ))}
      </div>
      {links.length > 1 ? (
        <ButtonRow className="mt-2">
          <CopyButton text={allLinks} label="Copy all links" variant="quiet" />
        </ButtonRow>
      ) : null}
    </div>
  );
}

type InviteSheetProps = Signature & {
  isEmailOn: boolean;
  // The profile fill-in's consent choice is Village's; it shows only while fill-in can run (readIsFillInOffered).
  isFillInShown: boolean;
  savedBasis: FillInBasis | null;
  savedTermsDate: string | null;
  // "Waiting to sign in", under the form.
  children?: ReactNode;
};

function readToday() {
  return new Date().toISOString().slice(0, 10);
}

// Commonhall's "Invite members" sheet: one box for many people and one button, "Send invites" with mail on or "Create
// invite links" with it off. The cohort is folded; the profile fill-in's consent shows only while fill-in can run,
// on "Ask each member at sign-in".
export function InviteSheet({ community, inviterName, inviterRole, isNetworkSearchOn, isEmailOn, isFillInShown, savedBasis, savedTermsDate, children }: InviteSheetProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [basisError, setBasisError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const signature = { community, inviterName, inviterRole, isNetworkSearchOn };

  const send = useMutation({
    mutationFn: async ({ text, cohort, basis, termsDate }: { text: string; cohort: string; basis: FillInBasis; termsDate: string }) => {
      if (isFillInShown && (basis !== savedBasis || (basis === FILL_IN_BASES.terms && termsDate !== savedTermsDate))) {
        const body = basis === FILL_IN_BASES.terms ? { basis, termsDate } : { basis };
        await postRequest(API_ROUTES.adminFillIn, body, acknowledgedResponseSchema);
      }
      return createBulkInvitesRequest(BULK_INVITE_FORMATS.list, text, cohort);
    },
    onSuccess: (result) => {
      const next = readOutcome(result);
      setOutcome(next);
      if (next.isOk) formRef.current?.reset();
      router.refresh();
    },
    onError: (error) => setFailure(error.message),
  });

  return (
    <section className="fh-sheet fh-c7">
      <h2 className="fh-h3">Invite members</h2>
      <form
        ref={formRef}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setFailure(null);
          setBasisError(null);
          const data = new FormData(event.currentTarget);
          const text = String(data.get("emails") ?? "");
          const cohort = String(data.get("cohort") ?? "");
          const basis = (String(data.get("lookup_basis") ?? FILL_IN_BASES.ask) as FillInBasis) || FILL_IN_BASES.ask;
          const termsDate = String(data.get("lookup_basis_date") ?? "");
          if (isNothingToInvite(text)) {
            setOutcome({ isOk: false, summary: EMPTY_MESSAGE, lines: [], links: [] });
            return;
          }
          if (isFillInShown && basis === FILL_IN_BASES.terms && !termsDate) {
            setBasisError(TERMS_DATE_MESSAGE);
            return;
          }
          send.mutate({ text, cohort, basis, termsDate });
        }}
      >
        <label className="fh-label mt-2.5" htmlFor="invite-emails">
          Paste emails, one per line, or a CSV of name and email
        </label>
        <textarea
          className="fh-textarea min-h-[120px]"
          id="invite-emails"
          name="emails"
          maxLength={MAXIMUM_LISTED_INVITES * 400}
          placeholder={"e.g. ada.founder@example.com\nSam Lee, sam.lee@example.com"}
        />
        {isEmailOn ? null : (
          <p className="fh-hint">
            <Link href={MAIL_PAGE}>Mail</Link> is off: you get a link to copy for each founder.
          </p>
        )}

        {/* Community's cohort (group), as on Import members' CSV column and the setup step's single invite: one for
            everyone pasted here, on their card when they join. */}
        <details className="mt-3">
          <summary className="fh-small cursor-pointer">Add a cohort</summary>
          <label className="fh-label mt-2" htmlFor="invite-cohort">
            Cohort
          </label>
          <input className="fh-input" id="invite-cohort" name="cohort" autoComplete="off" maxLength={PROFILE_LIMITS.cohort} placeholder="e.g. Fall 2025" />
        </details>

        {isFillInShown ? (
          <fieldset className="fh-basis mt-4 border-0 p-0" id="basis">
            <legend className="fh-label">Profile fill-in: how did these members agree?</legend>
            <p className="fh-hint mt-0 mb-2">Saved with today’s date and your name.</p>
            <div className="grid gap-2.5">
              <OptionCard
                id="basis-terms"
                name="lookup_basis"
                value={FILL_IN_BASES.terms}
                defaultChecked={savedBasis === FILL_IN_BASES.terms}
                title="Members agreed in our membership terms on"
                description={
                  <span className="mt-1.5 block">
                    <input
                      className="fh-input"
                      type="date"
                      name="lookup_basis_date"
                      defaultValue={savedTermsDate ?? ""}
                      max={readToday()}
                      aria-label="The date members agreed to the membership terms"
                    />
                  </span>
                }
              />
              <OptionCard
                id="basis-ask"
                name="lookup_basis"
                value={FILL_IN_BASES.ask}
                defaultChecked={savedBasis !== FILL_IN_BASES.terms}
                title="Ask each member at sign-in"
                isRecommended
                description="Nothing is filled in until they tick “Fill in my profile from public profiles”."
              />
            </div>
            {basisError ? (
              <p className="fh-hint fh-err" role="alert">
                {basisError}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <ButtonRow className="mt-3">
          <Button type="submit" size="sm" disabled={send.isPending}>
            {isEmailOn ? <Send aria-hidden="true" strokeWidth={1.5} /> : <Link2 aria-hidden="true" strokeWidth={1.5} />}
            {send.isPending ? (isEmailOn ? "Sending…" : "Creating…") : isEmailOn ? "Send invites" : "Create invite links"}
          </Button>
        </ButtonRow>
      </form>

      {failure ? (
        <Note className="mt-3.5" role="alert">
          {failure}
        </Note>
      ) : outcome ? (
        <Note kind={outcome.isOk ? "ok" : "plain"} icon={null} className="mt-3.5" role="status">
          {outcome.summary}
          {outcome.lines.map((line) => (
            <span key={line}>
              <br />
              {line}
            </span>
          ))}
        </Note>
      ) : null}
      {outcome && outcome.links.length > 0 ? <SendYourself links={outcome.links} signature={signature} /> : null}
      {children}
    </section>
  );
}
