import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { isMailtoLink } from "../../contract";

// The Apply button for one job, opening the hiring tool in a new tab (or the mail app, for an email address).
const APPLY_LOOK =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-card px-card-phone py-2 text-[15px] font-bold shadow-[inset_0_0_0_1.5px_var(--input)] hover:bg-muted max-sm:w-full max-sm:justify-center";

export function ApplyLink({ url, title, company }: { url: string; title: string; company: string }) {
  const isMail = isMailtoLink(url);
  return (
    <a
      href={url}
      {...(isMail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className={APPLY_LOOK}
    >
      Apply
      <ExternalLink aria-hidden="true" className="size-4" />
      <span className="sr-only">
        {" "}
        for {title} at {company}
        {isMail ? " (writes an email)" : " (opens in a new tab)"}
      </span>
    </a>
  );
}

// A job with no apply link: Apply opens a message to the founder who added it. Nothing without a link to give.
export function ApplyByMessage({ href, title, company }: { href: string | null; title: string; company: string }) {
  if (!href) return null;
  return (
    <Link href={href} className={APPLY_LOOK}>
      Apply
      <span className="sr-only">
        {" "}
        for {title} at {company} (writes a message)
      </span>
    </Link>
  );
}
