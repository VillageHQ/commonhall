import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import "./today.css";

import { FlashNote } from "@/components/flash";
import { Avatar } from "@/components/ui/avatar";
import { ListRow, SectionLabel } from "@/components/ui/list-row";
import { ASKS_PAGE, describeAgo, describeAnswerCount, toAskPage, type AskAllowance } from "@/modules/asks/contract";
import { AsksComposer, type ComposerMember } from "@/modules/asks/components/asks-composer";
import { ClampedBody } from "@/modules/asks/components/clamped-body";
import { INTRO_STATES, type Intro } from "@/modules/intros/contract";
import { TargetMemberAsk } from "@/modules/intros/components/target-member-ask";
import { describeRoomPeople, toRoomHref } from "@/modules/voice/contract";
import type { LiveRoom } from "@/modules/voice/reads-live";
import { ROUTES } from "@/platform/http/routes";

import { NextStepCard } from "./next-step-card";
import type { NextStep } from "./next-steps";
import { FactButtons, HelpAskButtons } from "./today-actions";
import type { TodayItems } from "./today";

// At most this many things wait on Today, and this many asks you could help with (the round-6 spec).
export const TODAY_LIMITS = { waiting: 3, help: 2, faces: 4 } as const;

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

// "Sam’s", "James’" (Commonhall's poss()).
export function possessive(name: string) {
  return name.endsWith("s") ? `${name}’` : `${name}’s`;
}

// "Maya + 3": the same words as the Rooms cards (voice/contract.ts).
export { describeRoomPeople };

// A waiting intro as a row: line 1 says what it is, line 2 the detail.
function describeIntroRow(intro: Intro) {
  if (intro.state === INTRO_STATES.requested) return { title: intro.requester.name, line: `Asks you to introduce them to ${intro.target.name}.` };
  return { title: `${intro.target.name} said yes`, line: `Introduce ${firstWord(intro.requester.name)} to ${firstWord(intro.target.name)}.` };
}

// The "Live now" card, built to the room card (ui-polish SPEC "The room card", as Rooms draws it): the live dot,
// "Live" and the host; the title; up to 4 faces (40 px, then 28 px) and who is in; a 36 px Join. The whole card joins
// (a stretched link under the button, so no control sits inside another). Shown only while a room is live.
export function LiveNowCard({ room }: { room: LiveRoom }) {
  const href = toRoomHref(room.id);
  const faces = room.faces.slice(0, TODAY_LIMITS.faces);
  return (
    <section className="td-live" aria-label="Live now">
      <p className="td-live-l1">
        <span className="td-live-dot" aria-hidden="true" />
        <span className="td-live-word">Live</span>
        {room.hostName ? <span className="td-live-host"> · {room.hostName}</span> : null}
      </p>
      <h2 className="td-live-title">
        <Link className="td-live-link" href={href}>
          {room.title}
        </Link>
      </h2>
      <div className="td-live-row">
        {faces.length ? (
          <span className="td-stack" aria-hidden="true">
            {faces.map((face, index) => (
              <Avatar key={`${face.name}-${index}`} stableId={face.name} name={face.name} imageUrl={face.image} sizePx={index === 0 ? 40 : 28} />
            ))}
          </span>
        ) : null}
        <span className="td-live-people">{describeRoomPeople(room)}</span>
        <Link className="fh-btn fh-btn-primary fh-btn-sm td-live-join" href={href} aria-label={`Join ${room.title}`}>
          Join
        </Link>
      </div>
    </section>
  );
}

type MoreLink = { label: string; href: string; icon?: LucideIcon; isFullLoad?: boolean };

type TodayPageProps = {
  today: TodayItems;
  // The member: their face heads the prompt row and the composer.
  member?: ComposerMember;
  memberName: string;
  dateLabel: string;
  // The week's asks left (the composer's line); null while Asks is off.
  allowance?: AskAllowance | null;
  // The live room at the top (null while none is live or Rooms is off).
  liveRoom: LiveRoom | null;
  // Only where reply-by-email is set up: the weekly email's day.
  replyDay: string | null;
  // "Is this right?" lines, only in a member's first two weeks.
  showFacts: boolean;
  isAsksOn: boolean;
  nextSteps: readonly NextStep[];
  lookupQuestion: ReactNode;
  // "Add <fund> to your home screen" (src/components/alerts/install-card.tsx).
  installCard?: ReactNode;
  flash: string | null;
  // Jobs, Perks, Library: whichever are on.
  moreLinks: readonly MoreLink[];
  now: Date;
};

const NO_ALLOWANCE: AskAllowance = { cap: 0, used: 0, left: 0, backAt: null };

// Commonhall's Today (round 8, ui-polish Part 4): the date, the greeting and the prompt row that opens the composer;
// then what waits on you as rows (the heading counts exactly the items shown; round 7 keeps them first), the live
// room's card, the one-time cards, asks you could help with as cards with two equal buttons, and "More for you" as
// rows. Every button on Today is 36 px. Your own asks live on Asks › Yours.
export function TodayPage({ today, member, memberName, dateLabel, allowance = null, liveRoom, replyDay, showFacts, isAsksOn, nextSteps, lookupQuestion, installCard = null, flash, moreLinks, now }: TodayPageProps) {
  const first = firstWord(memberName);
  const forYou = today.introsForYou ?? [];
  const intros = [...today.introsToAnswer, ...today.introsToFinish];
  // Gone once they open the ask, back with the next answer.
  const answered = today.ownPosts.filter(({ hasNewAnswers }) => hasNewAnswers);
  const facts = showFacts ? today.profileLines : [];
  // Waiting on you: intros for your yes first, then intros you're asked to make, then answers to your asks; 3 at most.
  const shownForYou = forYou.slice(0, TODAY_LIMITS.waiting);
  const shownIntros = intros.slice(0, TODAY_LIMITS.waiting - shownForYou.length);
  const shownAnswered = answered.slice(0, TODAY_LIMITS.waiting - shownForYou.length - shownIntros.length);
  const waitingCount = shownForYou.length + shownIntros.length + shownAnswered.length;
  const help = today.helpableAsks.slice(0, TODAY_LIMITS.help);
  const composer = member ?? { id: memberName, name: memberName, image: null };
  const title = waitingCount
    ? `${first}, ${waitingCount === 1 ? "one thing waits" : `${waitingCount} things wait`} for you`
    : help.length
      ? `${first}, you could help`
      : "Nothing needs you right now";

  return (
    <div className="td-page">
      {flash ? <FlashNote>{flash}</FlashNote> : null}
      <header data-slot="page-header" className="td-head">
        <p className="td-date">{dateLabel}</p>
        <h1 className="td-title">{title}</h1>
        {replyDay && (waitingCount || help.length) ? <p className="td-lede">Or answer by replying to {possessive(replyDay)} email.</p> : null}
      </header>
      {isAsksOn ? (
        <div className="td-prompt">
          <AsksComposer member={composer} allowance={allowance ?? NO_ALLOWANCE} />
        </div>
      ) : null}
      {waitingCount ? (
        <section className="td-sec" aria-labelledby="td-waiting">
          <SectionLabel id="td-waiting">Waiting on you</SectionLabel>
          {/* One list, so every waiting row starts at the same x (the yes-or-no row too). */}
          <div className="td-rows">
            {shownForYou.map((intro) => (
              <TargetMemberAsk key={intro.id} intro={intro} ago={describeAgo(intro.createdAt, now)} />
            ))}
            {shownIntros.map((intro) => {
              const row = describeIntroRow(intro);
              return (
                <ListRow
                  key={intro.id}
                  face={<Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} sizePx={48} />}
                  title={row.title}
                  meta={describeAgo(intro.createdAt, now)}
                  line={row.line}
                  lines={2}
                  below={
                    <Link className="fh-btn fh-btn-primary fh-btn-sm" href={`${ROUTES.intros}/${intro.id}`} aria-label={`Answer: ${row.title}`}>
                      Answer
                    </Link>
                  }
                />
              );
            })}
            {shownAnswered.map((post) => (
              <ListRow
                key={post.id}
                face={<Avatar stableId={composer.id} name={composer.name} imageUrl={composer.image ?? null} sizePx={48} />}
                title={`Your ask · ${describeAnswerCount(post.answerCount)}`}
                line={post.body}
                lines={2}
                below={
                  <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={toAskPage(post.id)} aria-label={`Read the answers to ${post.body}`}>
                    Read
                  </Link>
                }
              />
            ))}
          </div>
        </section>
      ) : null}
      {liveRoom ? <LiveNowCard room={liveRoom} /> : null}
      {installCard}
      {lookupQuestion}
      {help.length ? (
        <section className="td-sec" aria-labelledby="td-help">
          <div className="td-label-row">
            <SectionLabel id="td-help">You could help</SectionLabel>
            <Link href={ASKS_PAGE}>All asks</Link>
          </div>
          {help.map((ask) => (
            <article key={ask.id} className="fh-titem td-card" id={`ask-${ask.id}`}>
              <div className="td-card-head">
                <Avatar stableId={ask.author.id} name={ask.author.name} imageUrl={ask.author.avatarUrl} sizePx={32} />
                <b>{ask.author.name}</b>
              </div>
              <ClampedBody href={toAskPage(ask.id)} text={ask.title} className="td-card-body" />
              <HelpAskButtons askId={ask.id} knownPerson={ask.knownPerson} whyYou={ask.whyYou} />
            </article>
          ))}
        </section>
      ) : null}
      {facts.length ? (
        <section className="td-sec" aria-labelledby="td-facts">
          <SectionLabel id="td-facts">Is this right?</SectionLabel>
          {facts.map((fact) => (
            <article key={fact.field} className="fh-titem td-card fh-fact" id={`fact-${fact.field}`}>
              <p className="td-factline">
                <b>{fact.label}</b> {fact.value}
              </p>
              <FactButtons field={fact.field} label={fact.label} value={fact.value} />
            </article>
          ))}
        </section>
      ) : null}
      {nextSteps.map((nextStep) => (
        <NextStepCard key={nextStep.title} nextStep={nextStep} />
      ))}
      {moreLinks.length ? (
        <nav className="td-sec" aria-labelledby="td-more">
          <SectionLabel id="td-more">More for you</SectionLabel>
          <ul className="td-more">
            {moreLinks.map((link) => {
              const Icon = link.icon;
              const inside = (
                <>
                  {Icon ? <Icon aria-hidden="true" className="td-more-icon" strokeWidth={1.5} /> : null}
                  <span>{link.label}</span>
                  <ChevronRight aria-hidden="true" className="td-more-chevron" strokeWidth={1.5} />
                </>
              );
              // Perks loads as a full page, so its own Content-Security-Policy header applies.
              return <li key={link.href}>{link.isFullLoad ? <a href={link.href}>{inside}</a> : <Link href={link.href}>{inside}</Link>}</li>;
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
