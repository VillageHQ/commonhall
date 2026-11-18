"use client";

import { CalendarPlus } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { CALL_REQUEST_API_ROUTE } from "@/modules/members/contract-community-roles";

const EXTERNAL_LINK_RELATIONSHIP = "noopener noreferrer nofollow";

// "Book a call": a plain link to the member's booking page, in a new tab. The click is recorded first, once, with a
// request that outlives the page (the admin counts calls requested); the tab opens either way.
export function recordCallClick(memberId: string) {
  void fetch(CALL_REQUEST_API_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId }),
    keepalive: true,
  }).catch(() => undefined);
}

type BookCallButtonProps = { memberId: string; memberName: string; bookingUrl: string; variant?: "primary" | "secondary"; size?: "sm" };

export function BookCallButton({ memberId, memberName, bookingUrl, variant = "secondary", size = "sm" }: BookCallButtonProps) {
  return (
    <a
      href={bookingUrl}
      target="_blank"
      rel={EXTERNAL_LINK_RELATIONSHIP}
      className={buttonVariants({ variant, size })}
      data-testid="book-call"
      onClick={() => recordCallClick(memberId)}
    >
      <CalendarPlus aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      Book a call
      <span className="sr-only"> with {memberName} (opens their booking page in a new tab)</span>
    </a>
  );
}
