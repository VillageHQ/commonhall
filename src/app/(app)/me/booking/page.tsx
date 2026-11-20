import type { Metadata } from "next";

import { BackLink } from "@/components/page-header";
import { readBrandingForPage } from "@/platform/branding/branding";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { BookingSheet } from "@/modules/members/components/booking-sheet";
import { membersManifest } from "@/modules/members/manifest";
import { readOwnBooking } from "@/modules/members/service-booking";

export const metadata: Metadata = { title: "Booking link" };

// My profile › Booking link: any https booking page, and who sees "Book a call" on the profile.
export default modulePage(membersManifest, async function BookingPage() {
  const member = await requireMember();
  const database = getDatabase();
  const [community, booking] = await Promise.all([readBrandingForPage(), readOwnBooking(database, member.id)]);
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Booking link</h1>
        <p className="fh-lede">Members see “Book a call” on your profile.</p>
      </header>
      <div className="max-w-[720px]">
        <BookingSheet communityName={community.name} bookingUrl={booking.bookingUrl} bookingVisibility={booking.bookingVisibility} />
      </div>
    </>
  );
});
