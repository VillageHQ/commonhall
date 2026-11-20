import { Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import "./today.css";

import { FlashNote } from "@/components/flash";
import { PageHeader, SectionHead } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { ASKS_COMPOSE_PAGE, ASKS_PAGE, describeAgo, describeAnswerCount, toAskPage } from "@/modules/asks/contract";
import { INTRO_STATES, type Intro } from "@/modules/intros/contract";
import { TargetMemberAsk } from "@/modules/intros/components/target-member-ask";
import { describeRoomPeople, toRoomHref } from "@/modules/voice/contract";
import type { LiveRoom } from "@/modules/voice/reads-live";
import { ROUTES } from "@/platform/http/routes";

import { NextStepCard } from "./next-step-card";
import type { NextStep } from "./next-steps";
import { FactButtons, NotThisWeekButton } from "./today-actions";
import type { TodayItems } from "./today";

// "Post an ask" opens the Asks box, focused (round 6: the old /ask intro wizard is gone from Today).
export const TODAY_COMPOSE_PAGE = ASKS_COMPOSE_PAGE;
// At most this many things wait on Today, and this many asks you could help with (the round-6 spec).
export const TODAY_LIMITS = { waiting: 3, help: 2, faces: 4 } as const;
const ICON = { "aria-hidden": true, className: "fh-i fh-xs", strokeWidth: 1.5 } as const;

function firstWord(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

// "Sam’s", "James’" (Commonhall's poss()).
export function possessive(name: string) {
  return name.endsWith("s") ? `${name}’` : `${name}’s`;
}

// "Maya + 3": the same words as the Rooms cards (voice/contract.ts).
export { describeRoomPeople };

function describeIntroLine(intro: Intro) {
  if (intro.state === INTRO_STATES.requested) return `${intro.requester.name} asks you to introduce them to ${intro.target.name}.`;
  return `${intro.target.name} said yes. Introduce ${firstWord(intro.requester.name)}.`;
}

// The full-width "Live now" card: shown only while a room is live (never a placeholder), one tap to the room.
export function LiveNowCard({ room }: { room: LiveRoom }) {
  return (
    <section className="td-live" aria-label="Live now">
      <div className="td-live-text">
        <span className="td-live-kicker">
          <span className="td-live-dot" aria-hidden="true" />
          Live now
        </span>
        <b className="td-live-title">{room.title}</b>
        <span className="td-live-faces">
          {room.faces.length ? (
            <span className="td-stack" aria-hidden="true">
              {room.faces.slice(0, TODAY_LIMITS.faces).map((face, index) => (
                <Avatar key={`${face.name}-${index}`} stableId={face.name} name={face.name} imageUrl={face.image} sizePx={28} />
              ))}
            </span>
          ) : null}
          {describeRoomPeople(room)}
        </span>
      </div>
      <Link className="fh-btn fh-btn-primary" href={toRoomHref(room.id)} aria-label={`Join ${room.title}`}>
        Join
      </Link>
    </section>
  );
}

type MoreLink = { label: string; href: string; isFullLoad?: boolean };

type TodayPageProps = {
  today: TodayItems;
  memberName: string;
  dateLabel: string;
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

// Commonhall's Today, round 6: the live room first, then what waits on you, then asks you could help with, then one
// "More for you" row. Your own asks live on Asks › Yours.
export function TodayPage({ today, memberName, dateLabel, liveRoom, replyDay, showFacts, isAsksOn, nextSteps, lookupQuestion, installCard = null, flash, moreLinks, now }: TodayPageProps) {
  const first = firstWord(memberName);
  const forYou = today.introsForYou ?? [];
  const intros = [...today.introsToAnswer, ...today.introsToFinish];
  const answered = today.ownPosts.filter(({ answerCount }) => answerCount > 0);
  const facts = showFacts ? today.profileLines : [];
  // Waiting on you: intros for your yes first, then intros you're asked to make, then answers to your asks; 3 at most.
  const shownForYou = forYou.slice(0, TODAY_LIMITS.waiting);
  const shownIntros = intros.slice(0, TODAY_LIMITS.waiting - shownForYou.length);
  const shownAnswered = answered.slice(0, TODAY_LIMITS.waiting - shownForYou.length - shownIntros.length);
  const waitingCount = forYou.length + intros.length + answered.length;
  const help = today.helpableAsks.slice(0, TODAY_LIMITS.help);
  const title = waitingCount
    ? `${first}, ${waitingCount === 1 ? "one thing waits" : `${waitingCount} things wait`} for you`
    : help.length
      ? `${first}, you could help`
      : "Nothing needs you right now";

  return (
    <div className="td-page">
      {flash ? <FlashNote>{flash}</FlashNote> : null}
      <PageHeader
        eyebrow={dateLabel}
        title={title}
        description={replyDay && (waitingCount || help.length) ? `Or answer by replying to ${possessive(replyDay)} email.` : undefined}
        action={
          isAsksOn ? (
            <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={TODAY_COMPOSE_PAGE}>
              <Plus {...ICON} />
              Post an ask
            </Link>
          ) : undefined
        }
      />
      {liveRoom ? <LiveNowCard room={liveRoom} /> : null}
      {installCard}
      {lookupQuestion}
      {waitingCount ? (
        <section className="fh-tsec">
          <SectionHead title="Waiting on you" />
          {shownForYou.map((intro) => (
            <TargetMemberAsk key={intro.id} intro={intro} ago={describeAgo(intro.createdAt, now)} />
          ))}
          {shownIntros.map((intro) => (
            <article key={intro.id} className="fh-titem td-row">
              <Avatar stableId={intro.requester.id} name={intro.requester.name} imageUrl={intro.requester.avatarUrl} sizePx={28} />
              <div>
                <b>{describeIntroLine(intro)}</b>
              </div>
              <Link className="fh-btn fh-btn-primary fh-btn-sm" href={`${ROUTES.intros}/${intro.id}`}>
                Answer
              </Link>
            </article>
          ))}
          {shownAnswered.map((post) => (
            <article key={post.id} className="fh-titem td-row">
              <div>
                <b>{post.body}</b>
                <span className="fh-small fh-muted">Your ask · {describeAnswerCount(post.answerCount)}</span>
              </div>
              <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={toAskPage(post.id)} aria-label={`Read the answers to ${post.body}`}>
                Read
              </Link>
            </article>
          ))}
        </section>
      ) : null}
      {help.length ? (
        <section className="fh-tsec">
          <SectionHead title="You could help" link={<Link href={ASKS_PAGE}>All asks</Link>} />
          {help.map((ask) => (
            <article key={ask.id} className="fh-titem" id={`ask-${ask.id}`}>
              <div className="fh-ph">
                <Avatar stableId={ask.author.id} name={ask.author.name} imageUrl={ask.author.avatarUrl} sizePx={28} />
                <div>
                  <b>{ask.author.name}</b>
                </div>
              </div>
              <p className="fh-body">{ask.title}</p>
              <div className="fh-btn-row">
                <Link className="fh-btn fh-btn-primary" href={`${toAskPage(ask.id)}#help`} title={ask.whyYou}>
                  I can help
                </Link>
                <NotThisWeekButton askId={ask.id} />
              </div>
            </article>
          ))}
        </section>
      ) : null}
      {facts.length ? (
        <section className="fh-tsec">
          <SectionHead title="Is this right?" />
          {facts.map((fact) => (
            <article key={fact.field} className="fh-titem fh-fact" id={`fact-${fact.field}`}>
              <p className="fh-factline">
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
        <nav className="td-more" aria-label="More for you">
          <b>More for you</b>
          {moreLinks.map((link) =>
            // Perks loads as a full page, so its own Content-Security-Policy header applies.
            link.isFullLoad ? (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </nav>
      ) : null}
    </div>
  );
}
