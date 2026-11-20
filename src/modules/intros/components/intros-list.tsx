import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Row, Rows } from "@/components/ui/rows";
import { ROUTES } from "@/platform/http/routes";
import { formatDayMonth } from "@/platform/text/format-date";

import { STATES_WAITING_ON_INTRODUCER, type Intro, type IntroBoard, type IntroForTarget } from "../contract";
import { TargetMemberAsk } from "./target-member-ask";
import { readPartOfPill, readStatusPill, readTargetCompany } from "./intro-words";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="fh-section">
      <div className="fh-section-head">
        <h2 className="fh-h3">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const href = (intro: Intro) => `${ROUTES.intros}/${intro.id}`;

const isWaitingOnYou = (intro: Intro) => (STATES_WAITING_ON_INTRODUCER as readonly string[]).includes(intro.state);

function WaitingRow({ intro }: { intro: Intro }) {
  return (
    <Row
      href={href(intro)}
      start={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} />}
      title={`${intro.requester.name} asks you for an intro to ${intro.target.name}`}
      detail={formatDayMonth(intro.createdAt)}
      end={<Pill tone="needs">Answer</Pill>}
    />
  );
}

function YourAskRow({ intro }: { intro: Intro }) {
  const pill = readStatusPill(intro);
  const company = readTargetCompany(intro);
  return (
    <Row
      href={href(intro)}
      start={<Avatar stableId={intro.id} name={intro.target.name} />}
      title={`${intro.target.name} via ${intro.introducer.name}`}
      detail={[company, `asked ${formatDayMonth(intro.createdAt)}`].filter(Boolean).join(" · ")}
      end={<Pill tone={pill.tone}>{pill.label}</Pill>}
    />
  );
}

function PartOfRow({ intro }: { intro: Intro }) {
  const pill = readPartOfPill(intro);
  return (
    <Row
      href={href(intro)}
      start={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} />}
      title={`${intro.requester.name} → ${intro.target.name}`}
      detail={`asked ${formatDayMonth(intro.createdAt)}`}
      end={<Pill tone={pill.tone}>{pill.label}</Pill>}
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
    <Section title="Waiting for your yes">
      {forYou.map((intro) => (
        <TargetMemberAsk key={intro.id} intro={intro} ago={describeAskedAgo(intro.createdAt, now)} />
      ))}
      {toAnswer.length > 0 ? (
        <Rows>
          {toAnswer.map((intro) => (
            <WaitingRow key={intro.id} intro={intro} />
          ))}
        </Rows>
      ) : null}
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
          <Rows>
            {board.yourAsks.map((intro) => (
              <YourAskRow key={intro.id} intro={intro} />
            ))}
          </Rows>
        ) : (
          <div data-slot="empty-state" className="fh-empty">
            <p>No intro asks yet.</p>
            <div className="fh-btn-row mt-3.5">
              <Link className="fh-btn fh-btn-secondary" href={ROUTES.people}>
                Find someone
              </Link>
            </div>
          </div>
        )}
      </Section>
      {partOf.length > 0 ? (
        <Section title="You were part of">
          <Rows>
            {partOf.map((intro) => (
              <PartOfRow key={intro.id} intro={intro} />
            ))}
          </Rows>
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
