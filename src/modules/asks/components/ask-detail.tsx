import { Pin, Search } from "lucide-react";
import Link from "next/link";

import { FlashNote } from "@/components/flash";
import { BackLink } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";

import { ASK_ANSWER_KINDS, ASK_KINDS, ASK_STATES, describeAgo, describeAnswerCount, describeCanHelp, describeHelperLine, ASKS_PAGE, type AskMember } from "../contract";
import type { AskDetail as AskDetailData, PostAnswer, PostHelper } from "../reads-board";
import { AnswerForm, AskViaButton, HelpForm, RenewButton, ReportLink, StatusButtons } from "./ask-detail-forms";
import { AskConsent, CompanyMark, describeAbout, ICON, MemberAvatar, PostStatusPill } from "./post-parts";

const ANSWER_KIND_LABELS: Record<string, string | null> = {
  [ASK_ANSWER_KINDS.knowSomeone]: "Knows someone",
  [ASK_ANSWER_KINDS.doneMyself]: "Has done this",
  [ASK_ANSWER_KINDS.answer]: null,
};

const FULL_AVATAR_PX = 36;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function memberHref(id: string) {
  return `/members/${id}`;
}

function Warmth({ warmth }: { warmth: string | null }) {
  if (!warmth) return null;
  return (
    <>
      {" "}
      <span className={warmth === "met" ? "fh-warm fh-met" : "fh-warm"}>{`${warmth.charAt(0).toUpperCase()}${warmth.slice(1)}`}</span>
    </>
  );
}

type HelperRowProps = { helper: PostHelper; viewer: AskMember; viewerId: string; isOwn: boolean; isOpen: boolean; askId: string; askTarget: string; offeredKind: string | null };

// Commonhall's helperRow: the member, how they could help, and on your own open ask the intro and message buttons.
function HelperRow({ helper, viewer, viewerId, isOwn, isOpen, askId, askTarget, offeredKind }: HelperRowProps) {
  const { member } = helper;
  const line = describeHelperLine(helper);
  const offeredLabel = offeredKind ? ANSWER_KIND_LABELS[offeredKind] : null;
  const isPath = line.knows !== null;
  return (
    <article className="fh-result fh-helper">
      <div className="fh-top">
        <Avatar stableId={member.id} name={member.name} imageUrl={member.avatarUrl} sizePx={FULL_AVATAR_PX} />
        <div className="fh-who">
          <Link href={memberHref(member.id)}>
            <span className="fh-name">{member.name}</span>
          </Link>
          <p>
            <CompanyMark url={member.companyLogoUrl} />
            {describeAbout(member)}
          </p>
        </div>
        {offeredLabel ? <Pill tone="made">{offeredLabel}</Pill> : null}
      </div>
      {isPath && isOwn && line.knows ? (
        <div className="fh-path" aria-hidden="true">
          <MemberAvatar member={viewer} />
          <span className="fh-seg-line" />
          <MemberAvatar member={member} />
          <span className={helper.warmth === "met" ? "fh-seg-line fh-dash" : "fh-seg-line"} />
          <Avatar stableId={line.knows} name={line.knows} sizePx={28} isOutside />
        </div>
      ) : null}
      <p className="fh-pathtext">
        {isPath ? (
          <>
            Knows <b>{line.knows}</b>
            {line.title ? ` (${line.title})` : ""}
            {helper.why && member.id === viewerId ? ` · ${helper.why}` : ""}
            <Warmth warmth={helper.warmth} />
          </>
        ) : (
          line.title
        )}
      </p>
      {isOwn && isOpen ? (
        <div className="fh-btn-row">
          <AskViaButton
            askId={askId}
            helper={{ id: member.id, firstName: firstName(member.name) }}
            canAsk={helper.canAskForIntro}
            // A helper found by profile words has no path: the author says whom they'd like to meet.
            targetName={isPath ? null : askTarget}
          />
          <Link className="fh-btn fh-btn-quiet fh-btn-sm" href={`/messages/new?to=${member.id}`}>
            Message
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function AnswerRow({ answer, now, canReport }: { answer: PostAnswer; now: Date; canReport: boolean }) {
  const label = ANSWER_KIND_LABELS[answer.kind];
  return (
    <div className="fh-comment" id={`c-${answer.id}`}>
      <div className="fh-ch">
        <MemberAvatar member={answer.author} />
        <div>
          <b>{answer.author.name}</b> {label ? <Pill tone="made">{label}</Pill> : null}
          <small> {describeAgo(answer.createdAt, now)}</small>
        </div>
      </div>
      <p>{answer.body}</p>
      {canReport ? <ReportLink target="answer" id={answer.id} noun="answer" /> : null}
    </div>
  );
}

type AskDetailProps = {
  detail: AskDetailData;
  viewer: AskMember;
  isViewerAdmin: boolean;
  flash: string | null;
  now: Date;
};

// One ask (round 6): back link, the ask, who can help, the answers, then one way to respond: "I can help" with an
// optional note on someone else's open ask, or the reply box on your own ask and on an update.
export function AskDetail({ detail, viewer, isViewerAdmin, flash, now }: AskDetailProps) {
  const { post, helpers, privateOffers } = detail;
  const answers = [...detail.answers, ...privateOffers].toSorted((first, second) => first.createdAt.localeCompare(second.createdAt));
  const isOwn = post.isMine;
  const isAsk = post.kind === ASK_KINDS.ask;
  const isOpen = post.state === ASK_STATES.open;
  const canOfferHelp = !isOwn && isOpen && isAsk && !post.viewerHasHelped;
  const offeredBy = new Map(detail.answers.filter(({ kind }) => kind !== ASK_ANSWER_KINDS.answer).map(({ author, kind }) => [author.id, kind]));
  const viewerHelper = helpers.find(({ member }) => member.id === viewer.id) ?? null;
  // Others see who can help only as a count; the author sees each helper, with the intro buttons.
  const shownHelpers = isOwn ? helpers : [];
  const pinned = post.isPinned;
  const privateIds = new Set(privateOffers.map(({ id }) => id));
  return (
    <div className="fh-narrow">
      {flash ? <FlashNote>{flash}</FlashNote> : null}
      <BackLink href={ASKS_PAGE}>All asks</BackLink>
      <div className="fh-ph fh-askhead">
        <MemberAvatar member={post.author} />
        <b>{post.author.name}</b>
        <span>
          <CompanyMark url={post.author.companyLogoUrl} />
          {[post.author.company, describeAgo(post.createdAt, now)].filter(Boolean).join(" · ")}
        </span>
      </div>
      <h1 className="fh-askbody">{post.body}</h1>
      <div className="fh-tags" style={{ marginTop: 12 }}>
        {isAsk && isOpen ? null : <PostStatusPill kind={post.kind} state={post.state} />}
        {isAsk && post.who ? (
          <span className="fh-tag">
            <Search {...ICON} />
            {post.who}
          </span>
        ) : null}
        {pinned ? (
          <span className="fh-tag">
            <Pin {...ICON} />
            Pinned
          </span>
        ) : null}
      </div>
      <StatusButtons askId={post.id} isOwn={isOwn} isAsk={isAsk} isOpen={isOpen} isAdmin={isViewerAdmin} isPinned={pinned} />
      {isOwn && detail.canRenew ? (
        <div className="fh-btn-row" style={{ marginTop: 8 }}>
          <RenewButton askId={post.id} />
        </div>
      ) : null}
      {isAsk && isOpen ? (
        <p className="fh-small fh-muted" style={{ marginTop: 12 }}>
          {helpers.length > 0 ? `${describeCanHelp(helpers.length)}.` : "Nobody has a path yet; anyone can help."}
        </p>
      ) : null}
      {shownHelpers.length > 0 ? (
        <section className="fh-section">
          {shownHelpers.map((helper) => (
            <HelperRow
              key={helper.member.id}
              helper={helper}
              viewer={viewer}
              viewerId={viewer.id}
              isOwn={isOwn}
              isOpen={isOpen}
              askId={post.id}
              askTarget={post.targetName ?? ""}
              offeredKind={offeredBy.get(helper.member.id) ?? null}
            />
          ))}
          {isOpen ? <AskConsent /> : null}
        </section>
      ) : null}
      {canOfferHelp ? (
        <section className="fh-sheet fh-helpbox" id="help" style={{ marginTop: 16 }}>
          {post.viewerWhyYou && viewerHelper ? (
            <p className="fh-small">
              <b>Why you:</b> {post.viewerWhyYou}
            </p>
          ) : null}
          <HelpForm askId={post.id} authorFirstName={firstName(post.author.name)} knownPerson={viewerHelper?.personName ?? null} />
        </section>
      ) : null}
      <section className="fh-section" id="answers">
        {answers.length > 0 ? (
          <>
            <h2 className="fh-h2">{describeAnswerCount(answers.length)}</h2>
            <div className="fh-comments">
              {answers.map((answer) => (
                <AnswerRow key={answer.id} answer={answer} now={now} canReport={!answer.isMine && !privateIds.has(answer.id)} />
              ))}
            </div>
          </>
        ) : null}
        {canOfferHelp ? null : <AnswerForm askId={post.id} />}
      </section>
      {isOwn ? null : (
        <p style={{ marginTop: 16 }}>
          <ReportLink target="ask" id={post.id} noun={isAsk ? "ask" : "update"} />
        </p>
      )}
    </div>
  );
}
