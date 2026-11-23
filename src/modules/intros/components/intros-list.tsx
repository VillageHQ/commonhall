import { Handshake } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { ListRow, SectionLabel } from "@/components/ui/list-row";
import { ROUTES } from "@/platform/http/routes";
import { formatDayMonth } from "@/platform/text/format-date";

import { STATES_WAITING_ON_INTRODUCER, type Intro, type IntroBoard, type IntroForTarget } from "../contract";
import { TargetMemberAsk } from "./target-member-ask";
import { readPartOfPill, readStatusPill, readTargetCompany } from "./intro-words";

// A section of the Inbox (round 8, ui-polish Part 3): a SectionLabel over ListRows.
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fh-intro-sec" aria-label={title}>
      <SectionLabel>{title}</SectionLabel>
      <div data-slot="intro-rows">{children}</div>
    </section>
  );
}

const href = (intro: Intro) => `${ROUTES.intros}/${intro.id}`;

const isWaitingOnYou = (intro: Intro) => (STATES_WAITING_ON_INTRODUCER as readonly string[]).includes(intro.state);

// Line 2 with today's status word at its right, 13 px Graphite.
function LineWithStatus({ text, status }: { text: string; status: string }) {
  return (
    <span className="flex min-w-0 items-baseline gap-2">
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <span className="max-w-[50%] flex-none truncate text-[13px] font-normal text-graphite">{status}</span>
    </span>
  );
}

// An intro you're asked to make: the row opens it, and "Answer" (36 px, outlined) sits under the text.
function WaitingRow({ intro }: { intro: Intro }) {
  return (
    <ListRow
      face={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} sizePx={48} />}
      title={
        <Link href={href(intro)}>
          {intro.requester.name}{" "}
          <span className="sr-only">{`asks you for an intro to ${intro.target.name}`}</span>
        </Link>
      }
      meta={formatDayMonth(intro.createdAt)}
      line={`Asks you for an intro to ${intro.target.name}`}
      below={
        <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={href(intro)} tabIndex={-1} aria-hidden="true">
          Answer
        </Link>
      }
    />
  );
}

function YourAskRow({ intro }: { intro: Intro }) {
  const pill = readStatusPill(intro);
  const company = readTargetCompany(intro);
  return (
    <ListRow
      face={<Avatar stableId={intro.id} name={intro.target.name} sizePx={48} />}
      title={<Link href={href(intro)}>{`${intro.target.name} via ${intro.introducer.name}`}</Link>}
      meta={formatDayMonth(intro.createdAt)}
      line={<LineWithStatus text={company || `Asked ${formatDayMonth(intro.createdAt)}`} status={pill.label} />}
    />
  );
}

function PartOfRow({ intro }: { intro: Intro }) {
  const pill = readPartOfPill(intro);
  return (
    <ListRow
      face={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} sizePx={48} />}
      title={<Link href={href(intro)}>{intro.requester.name}</Link>}
      meta={formatDayMonth(intro.createdAt)}
      line={<LineWithStatus text={`Asked you for an intro to ${intro.target.name}`} status={pill.label} />}
    />
  );
}

const AGO = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function describeAskedAgo(at: string, now: Date) {
  const days = Math.round((now.getTime() - new Date(at).getTime()) / 86_400_000);
  return AGO.format(-Math.max(0, days), "day");
}

type WaitingProps = { board: IntroBoard; forYou?: IntroForTarget[]; now?: Date };

// The Inbox's top (round 6): the intro asks waiting for your yes, as the member asked to introduce (a row that opens
// the intro) or as the person asked for (INTRO-06, answered in place). Nothing shows while none waits.
export function IntrosWaitingForYes({ board, forYou = [], now = new Date() }: WaitingProps) {
  const toAnswer = board.asksForYou.filter(isWaitingOnYou);
  if (toAnswer.length + forYou.length === 0) return null;
  return (
    <Section title="Waiting on you">
      {forYou.map((intro) => (
        <TargetMemberAsk key={intro.id} intro={intro} ago={describeAskedAgo(intro.createdAt, now)} />
      ))}
      {toAnswer.map((intro) => (
        <WaitingRow key={intro.id} intro={intro} />
      ))}
    </Section>
  );
}

// The Inbox's Intros filter: the intros you asked for, then the ones you were part of.
export function YourIntros({ board }: { board: IntroBoard }) {
  const partOf = board.asksForYou.filter((intro) => !isWaitingOnYou(intro));
  return (
    <>
      <Section title="You asked">
        {board.yourAsks.length > 0 ? (
          board.yourAsks.map((intro) => <YourAskRow key={intro.id} intro={intro} />)
        ) : (
          <EmptyState icon={Handshake} headingLevel="h3" title="No intro asks yet." description="Ask for an intro from someone’s profile, or from People.">
            <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={ROUTES.people}>
              Find someone
            </Link>
          </EmptyState>
        )}
      </Section>
      {partOf.length > 0 ? (
        <Section title="You were part of">
          {partOf.map((intro) => (
            <PartOfRow key={intro.id} intro={intro} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

// Both, as the Inbox's Intros filter shows them.
export function IntrosList({ board, forYou = [], now = new Date() }: WaitingProps) {
  return (
    <>
      <IntrosWaitingForYes board={board} forYou={forYou} now={now} />
      <YourIntros board={board} />
    </>
  );
}
