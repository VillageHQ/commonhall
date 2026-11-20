import { Star } from "lucide-react";
import Link from "next/link";

import { CompanyName } from "@/components/company-name";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";

import { LIBRARY_JOB_LABELS, LIBRARY_KIND_LABELS, LIBRARY_VISIBILITIES, toLibraryItemPage } from "../contract";
import type { LibraryCard, LibraryMember } from "../reads";
import { UpvoteButton } from "./upvote-button";

const SMALL_FACE_PX = 24;

export const LIBRARY_ICON = { "aria-hidden": true, className: "fh-i fh-xs", strokeWidth: 1.5 } as const;

// `showCompany`: off on a browse card, where the name is enough.
export function MemberLine({ member, sizePx = SMALL_FACE_PX, href, showCompany = true }: { member: LibraryMember; sizePx?: number; href?: string; showCompany?: boolean }) {
  const name = href ? <Link href={href}>{member.name}</Link> : <b>{member.name}</b>;
  return (
    <span className="fh-lib-member">
      <Avatar stableId={member.id} name={member.name} imageUrl={member.avatarUrl} sizePx={sizePx} />
      <span className="min-w-0">
        {name}
        {member.company && showCompany ? (
          <span className="fh-small fh-muted">
            {" · "}
            <CompanyName company={member.company} logoUrl={member.companyLogoUrl} logoSizePx={14} />
          </span>
        ) : null}
      </span>
    </span>
  );
}

// `showRole`: off on a browse card (the Role filter covers it); on the item's own page.
export function KindTags({ item, showRole = true }: { item: Pick<LibraryCard, "kind" | "job" | "isFeatured" | "visibility">; showRole?: boolean }) {
  return (
    <span className="fh-lib-tags">
      {item.isFeatured ? (
        <Tag tone="accent">
          <Star {...LIBRARY_ICON} />
          Featured
        </Tag>
      ) : null}
      <Tag>{LIBRARY_KIND_LABELS[item.kind]}</Tag>
      {showRole && item.job ? <Tag>{LIBRARY_JOB_LABELS[item.job]}</Tag> : null}
      {item.visibility !== LIBRARY_VISIBILITIES.portfolio ? <Tag tone="gold">{item.visibility === LIBRARY_VISIBILITIES.fundTeam ? "Fund team" : "Chosen companies"}</Tag> : null}
    </span>
  );
}

// One item in the browse grid: its kind, the one line, who made it, and its upvotes.
export function LibraryItemCard({ item }: { item: LibraryCard }) {
  return (
    <article className="fh-sheet fh-lib-card" data-testid="library-card">
      <KindTags item={item} showRole={false} />
      <h2 className="fh-h3 mt-2">
        <Link href={toLibraryItemPage(item.id)} className="fh-lib-title">
          {item.title}
        </Link>
      </h2>
      <p className="fh-small mt-1">{item.pitch}</p>
      <div className="fh-lib-foot">
        <MemberLine member={item.author} showCompany={false} />
        <UpvoteButton itemId={item.id} upvotes={item.upvotes} isUpvoted={item.isUpvoted} isMine={item.isMine} size="sm" />
      </div>
    </article>
  );
}
