"use client";

import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { Button, buttonVariants } from "@/components/ui/button";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";

import { AboutForm, type AboutValues } from "../../welcome/about-form";

const finishResponseSchema = z.object({ next: z.string() });

async function finishAndOpenConsole() {
  const { next } = await postRequest(API_ROUTES.adminGuidedStart, {}, finishResponseSchema);
  window.location.assign(next);
}

// "Next": on to the next step (the invites are saved as they are made).
export function NextStepLink({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "primary" })}>
      Next
    </Link>
  );
}

// Ends the guided start (the last step's buttons, and "Skip the guided start"): sign-ins land on the console's Home
// from now on, and this opens it.
export function FinishGuidedStart({ label, variant = "primary" }: { label: string; variant?: "primary" | "quiet" | "link" }) {
  const [isPending, setIsPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        disabled={isPending}
        onClick={async () => {
          setIsPending(true);
          setFailure(null);
          try {
            await finishAndOpenConsole();
          } catch (error) {
            setIsPending(false);
            setFailure(error instanceof Error ? error.message : "That didn't work. Try again.");
          }
        }}
      >
        {label}
      </Button>
      {failure ? (
        <span role="alert" className="fh-hint fh-err">
          {failure}
        </span>
      ) : null}
    </>
  );
}

type GuidedCardFormProps = { initialValues: AboutValues };

// The last step, the admin's card: saving it (or "Skip for now") finishes the guided start and opens the console.
export function GuidedCardForm({ initialValues }: GuidedCardFormProps) {
  return <AboutForm initialValues={initialValues} onSaved={finishAndOpenConsole} submitLabel="Save and finish" secondary={<FinishGuidedStart label="Skip for now" variant="quiet" />} />;
}
