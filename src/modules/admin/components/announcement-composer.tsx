"use client";

import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { SegmentedControl } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ANNOUNCEMENT_AUDIENCES, ANNOUNCEMENT_LIMITS, type AnnouncementAudienceKind, type AnnouncementSent } from "@/modules/admin/contract-announcements";
import { sendAnnouncementRequest, sendAnnouncementTestRequest } from "@/modules/admin/queries-announcements";
import { ANNOUNCEMENT_FIELDS, readUnknownFields, renderAnnouncementText } from "@/modules/admin/rules-announcement-fields";

export type ComposerMember = { id: string; name: string; company: string | null; cohort: string | null; isWanted: boolean };
export type ComposerCohort = { name: string; memberCount: number; wantedCount: number };

type AnnouncementComposerProps = {
  members: readonly ComposerMember[];
  cohorts: readonly ComposerCohort[];
  community: string;
  adminId: string;
  isEmailOn: boolean;
  isFeedOn: boolean;
};

const AUDIENCE_SEGMENTS = [
  { value: ANNOUNCEMENT_AUDIENCES.everyone, label: "Everyone" },
  { value: ANNOUNCEMENT_AUDIENCES.cohort, label: "One cohort" },
] as const;

function readCohortKey(cohort: string | null) {
  return cohort?.trim().toLowerCase() ?? "";
}

function describeCount(count: number) {
  return count === 1 ? "1 member" : `${count} members`;
}

function readSentMessage({ queued, isPosted, isRepeat }: AnnouncementSent) {
  const emails = queued === 1 ? "1 email is" : `${queued} emails are`;
  const sent = `${isRepeat ? "Already sent: " : "Sent. "}${emails} on the way${isPosted ? ", and it's pinned at the top of the feed" : ""}.`;
  return sent;
}

// Admin › Announcements: subject and message with fill-in fields, who gets it, the email as one member will see it,
// a test to yourself, then the send (one email per member, and the team's pinned post when it goes to everyone).
export function AnnouncementComposer({ members, cohorts, community, adminId, isEmailOn, isFeedOn }: AnnouncementComposerProps) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [sendKey, setSendKey] = useState(() => crypto.randomUUID());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audienceKind, setAudienceKind] = useState<AnnouncementAudienceKind>(ANNOUNCEMENT_AUDIENCES.everyone);
  const [cohort, setCohort] = useState(cohorts[0]?.name ?? "");
  const [previewId, setPreviewId] = useState(adminId);
  const [isConfirming, setIsConfirming] = useState(false);
  const [lastSent, setLastSent] = useState<AnnouncementSent | null>(null);

  const inAudience = members.filter((member) => audienceKind === ANNOUNCEMENT_AUDIENCES.everyone || readCohortKey(member.cohort) === readCohortKey(cohort));
  const wantedCount = inAudience.filter(({ isWanted }) => isWanted).length;
  const previewMember = inAudience.find(({ id }) => id === previewId) ?? inAudience[0] ?? null;
  const unknownFields = readUnknownFields(`${subject}\n${body}`);
  const values = { fullName: previewMember?.name ?? null, company: previewMember?.company ?? null, community };
  const preview = renderAnnouncementText({ subject, body }, values, "(their own link to turn these off)");
  const audienceBody = audienceKind === ANNOUNCEMENT_AUDIENCES.cohort ? { audience: ANNOUNCEMENT_AUDIENCES.cohort, cohort } : { audience: ANNOUNCEMENT_AUDIENCES.everyone };

  const send = useMutation({
    mutationFn: () => sendAnnouncementRequest({ sendKey, subject, body, ...audienceBody }),
    onSuccess: (sent) => {
      setLastSent(sent);
      setIsConfirming(false);
      setSubject("");
      setBody("");
      setSendKey(crypto.randomUUID());
      router.refresh();
    },
    onError: () => setIsConfirming(false),
  });
  const test = useMutation({ mutationFn: () => sendAnnouncementTestRequest({ subject, body, memberId: previewMember?.id ?? "" }) });

  const isWritten = subject.trim().length > 0 && body.trim().length > 0;
  const emptyReason =
    inAudience.length === 0
      ? audienceKind === ANNOUNCEMENT_AUDIENCES.cohort && cohorts.length === 0
        ? "No member has a cohort yet. Add cohorts on the members' profiles or in an invite list."
        : "Nobody is in this audience yet, so it can't be sent."
      : wantedCount === 0
        ? "Everyone in this audience turned announcement emails off, so it can't be sent."
        : null;
  const willPost = isFeedOn && audienceKind === ANNOUNCEMENT_AUDIENCES.everyone;

  function insertField(field: string) {
    const area = bodyRef.current;
    const start = area?.selectionStart ?? body.length;
    const end = area?.selectionEnd ?? body.length;
    setBody(`${body.slice(0, start)}${field}${body.slice(end)}`);
    requestAnimationFrame(() => {
      area?.focus();
      area?.setSelectionRange(start + field.length, start + field.length);
    });
  }

  function changed() {
    setLastSent(null);
    setIsConfirming(false);
    send.reset();
    test.reset();
  }

  return (
    <>
      {lastSent ? (
        <Note kind="ok" role="status" className="mb-4">
          {readSentMessage(lastSent)}
        </Note>
      ) : null}
      {!isEmailOn ? (
        <Note kind="needs" className="mb-4">
          Email is off on this site, so announcements can&apos;t be sent yet. Set up email first (Set up › Mail).
        </Note>
      ) : null}
      <div className="fh-grid">
        <form
          className="fh-sheet fh-c7"
          noValidate
          aria-label="New announcement"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isConfirming) {
              setIsConfirming(true);
              return;
            }
            send.mutate();
          }}
        >
          <Field htmlFor="a-subject" label="Subject">
            <Input
              id="a-subject"
              name="subject"
              maxLength={ANNOUNCEMENT_LIMITS.subjectLength}
              placeholder="e.g. Demo day is on 4 December"
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                changed();
              }}
            />
          </Field>
          <Field
            htmlFor="a-body"
            label="Message"
            className="mt-3.5"
            hint={unknownFields.length > 0 ? `Not a field we know: ${unknownFields.join(", ")}. It will be left out.` : "Fields are filled in for each member. A missing first name reads “there”."}
          >
            <Textarea
              ref={bodyRef}
              id="a-body"
              name="body"
              rows={9}
              maxLength={ANNOUNCEMENT_LIMITS.bodyLength}
              placeholder={"e.g. Hi {first name},\n\nDemo day is on 4 December. Save the date."}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                changed();
              }}
            />
          </Field>
          <div role="group" aria-label="Add a fill-in field" className="fh-chips mt-2">
            {Object.values(ANNOUNCEMENT_FIELDS).map((field) => (
              <Chip key={field} type="button" isPressed={false} onClick={() => insertField(field)}>
                {field}
              </Chip>
            ))}
          </div>

          <div className="mt-5">
            <p className="fh-label">Who gets it</p>
            <SegmentedControl
              label="Who gets it"
              segments={AUDIENCE_SEGMENTS}
              value={audienceKind}
              onChange={(value) => {
                setAudienceKind(value);
                changed();
              }}
            />
          </div>
          {audienceKind === ANNOUNCEMENT_AUDIENCES.cohort && cohorts.length > 0 ? (
            <Field htmlFor="a-cohort" label="Cohort" className="mt-3.5">
              <Select
                id="a-cohort"
                value={cohort}
                onChange={(event) => {
                  setCohort(event.target.value);
                  changed();
                }}
              >
                {cohorts.map((choice) => (
                  <option key={choice.name} value={choice.name}>
                    {choice.name} ({describeCount(choice.memberCount)})
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <p className="fh-hint" role="status">
            {emptyReason ??
              `${describeCount(wantedCount)} will get the email${inAudience.length > wantedCount ? ` (${inAudience.length - wantedCount} turned announcements off)` : ""}.${
                willPost ? " It's also pinned at the top of the feed." : audienceKind === ANNOUNCEMENT_AUDIENCES.cohort ? " Email only: the feed is shared by everyone." : ""
              }`}
          </p>

          {send.error ? (
            <p role="alert" className="fh-hint fh-err">
              {send.error.message}
            </p>
          ) : null}
          {isConfirming ? (
            <Note kind="needs" className="mt-3.5">
              Send “{subject.trim()}” to {describeCount(wantedCount)} now? This can&apos;t be undone.
            </Note>
          ) : null}
          <div className="fh-btn-row mt-3.5">
            <Button type="submit" disabled={!isEmailOn || !isWritten || emptyReason !== null || send.isPending}>
              <Send aria-hidden="true" strokeWidth={1.5} />
              {send.isPending ? "Sending…" : isConfirming ? `Yes, send to ${describeCount(wantedCount)}` : `Send to ${describeCount(wantedCount)}`}
            </Button>
            {isConfirming ? (
              <Button type="button" variant="quiet" onClick={() => setIsConfirming(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <section className="fh-c5" aria-label="Preview">
          {previewMember ? (
            <Field htmlFor="a-preview" label="Preview as">
              <Select id="a-preview" value={previewMember.id} onChange={(event) => setPreviewId(event.target.value)}>
                {inAudience.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.company ? ` · ${member.company}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="fh-mail mt-3.5">
            <div className="fh-mail-h">
              <div>
                <span className="fh-k">From</span>
                <span className="fh-v">{community}</span>
              </div>
              <div className="fh-subj">{preview.subject || "Your subject"}</div>
            </div>
            <div className="fh-mail-b">
              <pre className="fh-mailtext">{body.trim() ? preview.text : "Your message, as this member will read it."}</pre>
            </div>
          </div>
          <div className="fh-btn-row mt-3.5">
            <Button type="button" variant="secondary" disabled={!isEmailOn || !isWritten || !previewMember || test.isPending} onClick={() => test.mutate()}>
              {test.isPending ? "Sending the test…" : "Send a test to me"}
            </Button>
          </div>
          {test.data ? (
            <p className="fh-hint" role="status">
              Test sent to {test.data.to}, filled in as {previewMember?.name}.
            </p>
          ) : null}
          {test.error ? (
            <p className="fh-hint fh-err" role="alert">
              {test.error.message}
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
