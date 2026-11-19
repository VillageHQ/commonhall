import { Download, ExternalLink, Upload } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

import { LIBRARY_PAGES, LIBRARY_VISIBILITIES, toLibraryFileUrl, type LibraryVisibility } from "../contract";
import type { LibraryItemDetail } from "../reads";
import { ItemActions, ReviewForm } from "./item-actions";
import { KindTags, LIBRARY_ICON, MemberLine } from "./library-parts";
import { UpvoteButton } from "./upvote-button";

const AUTHOR_FACE_PX = 40;

function describeSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function describeAudience(visibility: LibraryVisibility, companies: string[]) {
  if (visibility === LIBRARY_VISIBILITIES.fundTeam) return "Only the fund team can see this.";
  if (visibility === LIBRARY_VISIBILITIES.companies) return `Only people at ${companies.join(", ")} can see this.`;
  return "The whole portfolio can see this.";
}

type LibraryItemPageProps = { item: LibraryItemDetail; isAdmin: boolean; profileHref: string; flash: string | null };

// One item: what it does and who made it, the files or link, how to install it, upvotes and reviews.
export function LibraryItemPage({ item, isAdmin, profileHref, flash }: LibraryItemPageProps) {
  const ownReview = item.reviews.find((review) => review.isMine)?.body ?? null;
  return (
    <>
      {flash ? (
        <p role="status" className="fh-note fh-ok mb-3">
          {flash}
        </p>
      ) : null}
      <PageHeader back={{ href: LIBRARY_PAGES.browse, label: "Library" }} eyebrow={<KindTags item={item} />} title={item.title} description={item.pitch} />
      <div className="fh-asks-grid">
        <div className="fh-stack">
          <section className="fh-sheet">
            <div className="fh-lib-foot" style={{ marginTop: 0 }}>
              <UpvoteButton itemId={item.id} upvotes={item.upvotes} isUpvoted={item.isUpvoted} isMine={item.isMine} />
              <span className="fh-small fh-muted">
                {item.downloadCount} download{item.downloadCount === 1 ? "" : "s"} · version {item.versionCount}
              </span>
            </div>
            {item.files.length > 0 ? (
              <ul className="fh-lib-files">
                {item.files.map((file) => (
                  <li key={file.id}>
                    <a href={toLibraryFileUrl(file.id)} download={file.name}>
                      <Download {...LIBRARY_ICON} />
                      {file.name}
                    </a>
                    <span className="fh-small fh-muted">{describeSize(file.size)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {item.link ? (
              <p className="mt-3">
                <a href={item.link} target="_blank" rel="noopener noreferrer nofollow" className="fh-lib-link">
                  <ExternalLink {...LIBRARY_ICON} />
                  {item.link}
                </a>
              </p>
            ) : null}
            {item.isMine ? (
              <div className="fh-btn-row mt-4">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`${LIBRARY_PAGES.publish}?item=${item.id}`}>
                    <Upload {...LIBRARY_ICON} />
                    Edit or upload a new version
                  </Link>
                </Button>
              </div>
            ) : null}
          </section>
          {item.description ? (
            <section className="fh-sheet">
              <h2 className="fh-h3">What it is</h2>
              <p className="fh-lib-text mt-2">{item.description}</p>
            </section>
          ) : null}
          {item.install ? (
            <section className="fh-sheet">
              <h2 className="fh-h3">How to install</h2>
              <pre className="fh-lib-install mt-2">{item.install}</pre>
            </section>
          ) : null}
          <section className="fh-sheet" aria-labelledby="library-reviews">
            <h2 id="library-reviews" className="fh-h3">
              Reviews {item.reviews.length > 0 ? <span className="fh-muted">({item.reviews.length})</span> : null}
            </h2>
            {item.reviews.length > 0 ? (
              <ul className="fh-lib-reviews">
                {item.reviews.map((review) => (
                  <li key={review.id}>
                    <MemberLine member={review.author} />
                    <p className="mt-1">{review.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="fh-small fh-muted mt-2">No reviews yet.</p>
            )}
            {!item.isMine ? <ReviewForm itemId={item.id} existing={ownReview} /> : null}
          </section>
        </div>
        <aside className="fh-stack">
          <section className="fh-sheet">
            <h2 className="fh-h3">Made by</h2>
            <div className="mt-3">
              <MemberLine member={item.author} sizePx={AUTHOR_FACE_PX} href={profileHref} />
            </div>
            {item.author.title ? <p className="fh-small fh-muted mt-1">{item.author.title}</p> : null}
            {!item.isMine ? (
              <p className="fh-small mt-3">
                Questions? <Link href={profileHref}>Open their profile</Link> to message them or find a warm path.
              </p>
            ) : null}
            <p className="fh-small fh-muted mt-3">{describeAudience(item.visibility, item.companies)}</p>
          </section>
          <ItemActions itemId={item.id} isMine={item.isMine} isAdmin={isAdmin} isFeatured={item.isFeatured} />
        </aside>
      </div>
    </>
  );
}
