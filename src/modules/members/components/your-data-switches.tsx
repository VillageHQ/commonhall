"use client";

import { useMutation } from "@tanstack/react-query";
import { Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { SetRow } from "@/components/ui/rows";
import { Switch } from "@/components/ui/switch";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { reportCreditSchema } from "@/modules/members/contract-report-credit";
import { ME_PAGES } from "@/modules/members/contract-me-pages";

import { saveLookupChoice } from "./lookup-question-card";

const NO_LOOKUP_ID = "switch-no-lookup";
const CREDIT_ID = "switch-credit";

type SwitchesSheetProps = {
  // Null when the community doesn't fill in profiles at all.
  lookup: { isAllowed: boolean } | null;
  // Null while intros are off: "Credit me in reports" is not offered. Off by default.
  reportCredit?: { isOn: boolean } | null;
};

type SwitchesToSave = { allowsLookup: boolean | null; creditInReports: boolean | null };

async function saveSwitches({ allowsLookup, creditInReports }: SwitchesToSave) {
  if (allowsLookup !== null) await saveLookupChoice(allowsLookup);
  if (creditInReports !== null) await postRequest(API_ROUTES.profileReportCredit, { isOn: creditInReports }, reportCreditSchema);
}

// Commonhall's "Your switches" (member-me-data), round 6: the two that live only here, "Don't look me up" and (while
// intros are on) "Credit me in reports", off by default. Hide me and who can message me live on My profile › Privacy.
export function SwitchesSheet({ lookup, reportCredit = null }: SwitchesSheetProps) {
  const router = useRouter();
  const flash = useFlash();
  const [noLookup, setNoLookup] = useState(lookup ? !lookup.isAllowed : false);
  const [credited, setCredited] = useState(reportCredit?.isOn ?? false);
  const save = useMutation({
    mutationFn: saveSwitches,
    onSuccess: () => {
      flash("Privacy settings saved.");
      router.refresh();
      // Commonhall comes back to the switches after a save.
      document.getElementById("switches")?.scrollIntoView({ block: "start" });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lookupChanged = lookup !== null && noLookup === lookup.isAllowed;
    save.mutate({
      allowsLookup: lookupChanged ? !noLookup : null,
      creditInReports: reportCredit !== null && credited !== reportCredit.isOn ? credited : null,
    });
  }

  return (
    <form className="fh-sheet" id="switches" aria-labelledby="switches-title" onSubmit={submit}>
      <h2 id="switches-title" className="fh-h3 flex items-center gap-1.5">
        <Settings2 aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} /> Your switches
      </h2>
      {lookup ? (
        <SetRow
          htmlFor={NO_LOOKUP_ID}
          label="Don’t look me up on public profiles"
          hint="Deletes what was found. Your own words stay."
          control={<Switch id={NO_LOOKUP_ID} checked={noLookup} onCheckedChange={setNoLookup} />}
        />
      ) : null}
      {reportCredit ? (
        <SetRow
          htmlFor={CREDIT_ID}
          label="Credit me in reports"
          hint="Named as a top connector, never whom you introduced."
          control={<Switch id={CREDIT_ID} checked={credited} onCheckedChange={setCredited} />}
        />
      ) : null}
      <FormError message={save.error?.message ?? null} />
      <div className="fh-btn-row mt-3">
        {lookup || reportCredit ? (
          <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
            Save
          </Button>
        ) : null}
        <Button asChild variant="quiet" size="sm">
          <Link href={ME_PAGES.privacy}>Privacy</Link>
        </Button>
      </div>
    </form>
  );
}
