import { Hand, MessageSquare, Pin, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";

import { ASK_CONSENT, ASK_KINDS, ASK_STATES, describeAnswerCount, describeCanHelp, toAskPage, type AskMember } from "../contract";
import type { BoardPost } from "../reads-board";
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

// One ask in a list (round 6): who and their company, the ask, and one line: "You could help" when it was routed to
// you, the answers, and on your own asks who can help. The reason, the target and the date are on the ask's page.
// On For you, an ask you could help with also offers "Not for me".
export function PostCard({ post, isYoursTab = false, isForYouTab = false }: { post: BoardPost; isYoursTab?: boolean; isForYouTab?: boolean }) {
  const page = toAskPage(post.id);
  const isAsk = post.kind === ASK_KINDS.ask;
  const isOpen = post.state === ASK_STATES.open;
  const viewerCanHelp = post.viewerWhyYou !== null && isOpen && !post.viewerHasHelped;
  const showsHelpers = isYoursTab && isAsk && isOpen && post.helperCount > 0;
  return (
    <article className="fh-post" id={`post-${post.id}`}>
      <div className="fh-ph">
        <MemberAvatar member={post.author} />
        <div>
          <b>{post.author.name}</b>
          <span>
            <CompanyMark url={post.author.companyLogoUrl} />
            {post.author.company ?? ""}
          </span>
        </div>
        {post.isPinned ? (
          <span className="fh-pinmark">
            <Pin {...ICON} />
            Pinned
          </span>
        ) : null}
        {isAsk && isOpen ? null : <PostStatusPill kind={post.kind} state={post.state} />}
      </div>
      <p className="fh-body">
        <Link href={page}>{post.body}</Link>
      </p>
      {viewerCanHelp ? (
        <Link className="fh-helpers" href={`${page}#help`}>
          <Hand {...ICON} />
          <b>You could help</b>
        </Link>
      ) : null}
      {showsHelpers ? (
        <div className="fh-helpers">
          <span className="fh-stack">
            <AvatarStack people={post.helperFaces.map(({ id, name, avatarUrl }) => ({ id, name, imageUrl: avatarUrl }))} />
          </span>
          <b>{describeCanHelp(post.helperCount)}</b>
        </div>
      ) : null}
      {post.answerCount > 0 || (isYoursTab && isAsk && isOpen) || (isForYouTab && viewerCanHelp) ? (
        <div className="fh-acts">
          {post.answerCount > 0 ? (
            <Link className="fh-react" href={`${page}#answers`}>
              <MessageSquare {...ICON} />
              <span className="underline">{describeAnswerCount(post.answerCount)}</span>
            </Link>
          ) : null}
          {isYoursTab && isAsk && isOpen ? (
            <Link className="fh-react" href={page}>
              <span className="underline">Mark answered</span>
            </Link>
          ) : null}
          {isForYouTab && viewerCanHelp ? <SkipAskButton askId={post.id} /> : null}
        </div>
      ) : null}
    </article>
  );
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
