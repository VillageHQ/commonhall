"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { Button, ButtonRow, buttonVariants } from "@/components/ui/button";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { VillageConnect } from "@/modules/network/components/village-connect";

const finishResponseSchema = z.object({ next: z.string() });

// "Skip for now": on to the next step, nothing saved.
export function SkipForNow({ href }: { href: string }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "quiet" })}>
      Skip for now
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
            const { next } = await postRequest(API_ROUTES.adminGuidedStart, {}, finishResponseSchema);
            window.location.assign(next);
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

type VillageStepProps = { appUrl: string; connectedAppName: string | null; nextHref: string };

// Step 2: the Connect Village screen. "Next" turns on once the keys are checked and saved.
export function VillageStep({ appUrl, connectedAppName, nextHref }: VillageStepProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(connectedAppName !== null);
  return (
    <>
      <section className="fh-sheet">
        <VillageConnect appUrl={appUrl} connectedAppName={connectedAppName} onConnected={() => setIsConnected(true)} />
      </section>
      <ButtonRow className="mt-4">
        <Button type="button" disabled={!isConnected} onClick={() => router.push(nextHref)}>
          Next
        </Button>
        <SkipForNow href={nextHref} />
      </ButtonRow>
    </>
  );
}
