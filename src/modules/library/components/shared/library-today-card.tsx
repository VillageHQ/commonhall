import { ChevronRight, LibraryBig } from "lucide-react";
import Link from "next/link";

import { LIBRARY_KIND_LABELS, LIBRARY_PAGE, toLibraryItemPage } from "../../contract";
import type { LibraryCard } from "../../reads";

// Today's "New in the library": up to three items shared in the last two weeks that the member may see.
export function LibraryTodayCard({ items }: { items: LibraryCard[] }) {
  if (items.length === 0) return null;
  return (
    <section className="fh-sheet mt-3.5" aria-labelledby="today-library">
      <div className="fh-sheet-head">
        <h2 id="today-library" className="fh-h3">
          <LibraryBig aria-hidden="true" className="fh-i fh-xs mr-1.5 inline" strokeWidth={1.5} />
          New in the library
        </h2>
        <Link href={LIBRARY_PAGE}>See all</Link>
      </div>
      <ul className="fh-lib-today">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={toLibraryItemPage(item.id)}>
              <span className="min-w-0">
                <b>{item.title}</b>
                <span className="fh-small fh-muted">
                  {LIBRARY_KIND_LABELS[item.kind]} · {item.author.name}
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
