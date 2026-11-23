import type { ReactNode } from "react";

import { CompanyLogo } from "@/components/company-name";
import { Avatar } from "@/components/ui/avatar";

const PROFILE_AVATAR_SIZE_PX = 80;
const PROFILE_LOGO_SIZE_PX = 20;

type ProfileHeadProps = {
  memberId: string;
  name: string;
  imageUrl: string | null;
  companyLogoUrl: string | null;
  hasCompany: boolean;
  roleLine: string;
  children?: ReactNode;
};

// Commonhall's profile head (crop profile-head.png): the 80 px photo, the serif name, logo + "Role, Company · City",
// then what the page adds under it (chips and actions, or "This is how members see you").
export function ProfileHead({ memberId, name, imageUrl, companyLogoUrl, hasCompany, roleLine, children }: ProfileHeadProps) {
  return (
    <div className="fh-profile-head">
      <Avatar stableId={memberId} name={name} imageUrl={imageUrl} sizePx={PROFILE_AVATAR_SIZE_PX} />
      <div className="min-w-0">
        <h1 className="fh-h1 wrap-anywhere">{name}</h1>
        {roleLine ? (
          <p className="wrap-anywhere">
            {hasCompany ? <CompanyLogo url={companyLogoUrl} sizePx={PROFILE_LOGO_SIZE_PX} className="fh-colog fh-md mt-0" /> : null}
            {roleLine}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const PERSON_AVATAR_SIZE_PX = 96;

type PersonHeadProps = {
  memberId: string;
  name: string;
  imageUrl: string | null;
  companyLogoUrl: string | null;
  hasCompany: boolean;
  // "Founder & CEO, Ledgerline" and "London", each on its own line.
  headline: string;
  place: string | null;
  children?: ReactNode;
};

// A member's profile head (round 8, ui-polish Part 5; LinkedIn's and Instagram's): stacked and left-aligned on a
// phone, the 96 px photo, then the serif name, the headline, the place, and what the page adds (tags, the action row).
// From 1000 px the photo sits on the left and the words beside it (people.css).
export function PersonHead({ memberId, name, imageUrl, companyLogoUrl, hasCompany, headline, place, children }: PersonHeadProps) {
  return (
    <div className="fh-person-head" data-slot="person-head">
      <Avatar stableId={memberId} name={name} imageUrl={imageUrl} sizePx={PERSON_AVATAR_SIZE_PX} />
      <div className="fh-person-text">
        <h1 className="fh-person-name">{name}</h1>
        {headline ? (
          <p className="fh-person-headline">
            {hasCompany ? <CompanyLogo url={companyLogoUrl} className="fh-colog mt-0" /> : null}
            {headline}
          </p>
        ) : null}
        {place ? <p className="fh-person-place">{place}</p> : null}
        {children}
      </div>
    </div>
  );
}
