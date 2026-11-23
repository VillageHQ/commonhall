import { Archive, CircleCheck, Hand, MessageCircle, Pin, Search, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";

import { ASK_CONSENT, ASK_KINDS, ASK_STATES, describeAgo, describeAnswerCount, describeCanHelp, toAskPage, type AskMember } from "../contract";
import type { BoardPost } from "../reads-board";
import { ClampedBody } from "./clamped-body";
import { SkipAskButton } from "./skip-ask-button";

// Commonhall's ask parts (`.post`, the helpers strip, the status pill), shared by the board, the ask's page and Today.
export const ICON = { "aria-hidden": true, className: "fh-i fh-xs", strokeWidth: 1.5 } as const;

const SMALL_AVATAR_PX = 28;

export function MemberAvatar({ member, sizePx = SMALL_AVATAR_PX }: { member: Pick<AskMember, "id" | "name" | "avatarUrl">; sizePx?: number }) {
  return <Avatar stableId={member.id} name={member.name} imageUrl={member.avatarUrl} sizePx={sizePx} />;
}

// The company's logo mark before the role (Commonhall's logo()).
export function CompanyMark({ url }: { url: string | null }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a small remote logo, as Commonhall draws it
  return <img className="fh-colog inline-block" src={url} alt="" loading="lazy" referrerPolicy="no-referrer" />;
}

// "Founder & CEO, Kilnworks"
export function describeAbout(member: Pick<AskMember, "title" | "company">) {
  return [member.title, member.company].filter(Boolean).join(", ");
}

export function PostStatusPill({ kind, state }: { kind: string; state: BoardPost["state"] }) {
  if (kind === ASK_KINDS.update) return <Pill tone="plain">Update</Pill>;
  if (state === ASK_STATES.closed) return <Pill tone="made">Answered</Pill>;
  if (state === ASK_STATES.expired) return <Pill tone="declined">Closed</Pill>;
  return <Pill tone="open">Open</Pill>;
}

export function TargetLine({ who }: { who: string }) {
  if (!who) return null;
  return (
    <p className="fh-target">
      <Search {...ICON} />
      Trying to reach: {who}
    </p>
  );
}

// One ask in a list (round 8, ui-polish Part 4): a 36 px face, the name and the company line, the age at the right
// with "Pinned", "Update", "Answered" or "Closed" as quiet words; the ask cut at 4 lines with "more"; then one line:
// the answers (a line icon, no emoji), "You could help" when it was routed to you, and on your own asks who can help
// and "Mark answered". On For you, an ask you could help with also offers "Not for me".
export function PostCard({ post, isYoursTab = false, isForYouTab = false, now = new Date() }: { post: BoardPost; isYoursTab?: boolean; isForYouTab?: boolean; now?: Date }) {
  const page = toAskPage(post.id);
  const isAsk = post.kind === ASK_KINDS.ask;
  const isOpen = post.state === ASK_STATES.open;
  const viewerCanHelp = post.viewerWhyYou !== null && isOpen && !post.viewerHasHelped;
  const showsHelpers = isYoursTab && isAsk && isOpen && post.helperCount > 0;
  const company = post.author.company ?? "";
  return (
    <article className="ak-post-item" id={`post-${post.id}`}>
      <div className="ak-ph">
        <MemberAvatar member={post.author} sizePx={36} />
        <div className="min-w-0">
          <div className="ak-ph-l1">
            <b>{post.author.name}</b>
            <span className="ak-ph-end">
              {post.isPinned ? (
                <span className="ak-mark">
                  <Pin aria-hidden="true" strokeWidth={1.75} />
                  Pinned
                </span>
              ) : null}
              <PostStatusMark kind={post.kind} state={post.state} />
              <time dateTime={post.createdAt}>{describeAgo(post.createdAt, now)}</time>
            </span>
          </div>
          {company ? (
            <div className="ak-ph-l2">
              <CompanyMark url={post.author.companyLogoUrl} />
              <span>{company}</span>
            </div>
          ) : null}
        </div>
      </div>
      <ClampedBody href={page} text={post.body} />
      {post.answerCount > 0 || viewerCanHelp || showsHelpers || (isYoursTab && isAsk && isOpen) ? (
        <div className="ak-meta">
          {post.answerCount > 0 ? (
            <Link className="ak-meta-item" href={`${page}#answers`}>
              <MessageCircle aria-hidden="true" strokeWidth={1.75} />
              {describeAnswerCount(post.answerCount)}
            </Link>
          ) : null}
          {viewerCanHelp ? (
            <Link className="ak-meta-item ak-could" href={`${page}#help`}>
              <Hand aria-hidden="true" strokeWidth={1.75} />
              You could help
            </Link>
          ) : null}
          {showsHelpers ? (
            <span className="ak-meta-item">
              <span className="fh-stack">
                <AvatarStack people={post.helperFaces.map(({ id, name, avatarUrl }) => ({ id, name, imageUrl: avatarUrl }))} />
              </span>
              {describeCanHelp(post.helperCount)}
            </span>
          ) : null}
          {isYoursTab && isAsk && isOpen ? (
            <Link className="ak-meta-item" href={page}>
              <CircleCheck aria-hidden="true" strokeWidth={1.75} />
              Mark answered
            </Link>
          ) : null}
          {isForYouTab && viewerCanHelp ? <SkipAskButton askId={post.id} /> : null}
        </div>
      ) : null}
    </article>
  );
}

// The list's quiet status words (an open ask has none).
function PostStatusMark({ kind, state }: { kind: string; state: BoardPost["state"] }) {
  if (kind === ASK_KINDS.update)
    return (
      <span className="ak-mark">
        <Trophy aria-hidden="true" strokeWidth={1.75} />
        Update
      </span>
    );
  if (state === ASK_STATES.closed)
    return (
      <span className="ak-mark">
        <CircleCheck aria-hidden="true" strokeWidth={1.75} />
        Answered
      </span>
    );
  if (state === ASK_STATES.expired)
    return (
      <span className="ak-mark">
        <Archive aria-hidden="true" strokeWidth={1.75} />
        Closed
      </span>
    );
  return null;
}

// Commonhall's consent line as asks draw it: small, 12 px under what comes before.
export function AskConsent({ children = ASK_CONSENT }: { children?: string }) {
  return (
    <p className="fh-consent fh-small" style={{ marginTop: 12 }}>
      <ShieldCheck aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />
      <span>{children}</span>
    </p>
  );
}
