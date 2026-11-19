"use client";

import { useMutation } from "@tanstack/react-query";
import { Flag, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postRequest } from "@/platform/http/post-request";

import { LIBRARY_API_ROUTES, LIBRARY_LIMITS, LIBRARY_PAGES, libraryMessageResponseSchema } from "../contract";

const ICON = { "aria-hidden": true, strokeWidth: 1.5 } as const;

function useLibraryAction<Body>(path: string, onDone?: () => void) {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: Body) => postRequest(path, body, libraryMessageResponseSchema),
    onSuccess: () => {
      onDone?.();
      router.refresh();
    },
  });
}

// "Worked for us": one line. Writing again replaces your line.
export function ReviewForm({ itemId, existing }: { itemId: string; existing: string | null }) {
  const [body, setBody] = useState(existing ?? "");
  const review = useLibraryAction<{ itemId: string; body: string }>(LIBRARY_API_ROUTES.review);
  return (
    <form
      className="fh-lib-review-form"
      onSubmit={(event) => {
        event.preventDefault();
        review.mutate({ itemId, body });
      }}
    >
      <label htmlFor="library-review" className="fh-label">
        {existing ? "Your review" : "Did it work for you?"}
      </label>
      <div className="fh-lib-inline">
        <Input id="library-review" value={body} onChange={(event) => setBody(event.target.value)} maxLength={LIBRARY_LIMITS.reviewLength} placeholder="Worked for us: cut our reply time in half" required />
        <Button type="submit" variant="secondary" disabled={review.isPending}>
          {existing ? "Update" : "Post"}
        </Button>
      </div>
      {review.error ? (
        <p role="alert" className="fh-hint fh-err">
          {review.error.message}
        </p>
      ) : review.data ? (
        <p role="status" className="fh-hint">
          {review.data.message}
        </p>
      ) : null}
    </form>
  );
}

type ItemActionsProps = { itemId: string; isMine: boolean; isAdmin: boolean; isFeatured: boolean };

// The item's quiet actions: report (others), feature (admins), remove (the author or an admin).
export function ItemActions({ itemId, isMine, isAdmin, isFeatured }: ItemActionsProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const report = useLibraryAction<{ itemId: string }>(LIBRARY_API_ROUTES.report);
  const feature = useLibraryAction<{ itemId: string; isFeatured: boolean }>(LIBRARY_API_ROUTES.feature);
  const remove = useMutation({
    mutationFn: () => postRequest(LIBRARY_API_ROUTES.remove, { itemId }, libraryMessageResponseSchema),
    onSuccess: () => {
      router.push(`${LIBRARY_PAGES.browse}?m=removed`);
      router.refresh();
    },
  });
  const error = report.error ?? feature.error ?? remove.error;
  const done = report.data ?? feature.data;
  return (
    <div className="fh-lib-actions">
      <div className="fh-btn-row">
        {isAdmin ? (
          <Button type="button" variant="secondary" size="sm" disabled={feature.isPending} onClick={() => feature.mutate({ itemId, isFeatured: !isFeatured })}>
            <Star {...ICON} />
            {isFeatured ? "Stop featuring" : "Feature"}
          </Button>
        ) : null}
        {isMine || isAdmin ? (
          isConfirming ? (
            <>
              <Button type="button" variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
                Yes, remove it
              </Button>
              <Button type="button" variant="quiet" size="sm" onClick={() => setIsConfirming(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button type="button" variant="quiet" size="sm" onClick={() => setIsConfirming(true)}>
              <Trash2 {...ICON} />
              Remove
            </Button>
          )
        ) : null}
        {!isMine ? (
          <Button type="button" variant="quiet" size="sm" disabled={report.isPending || Boolean(report.data)} onClick={() => report.mutate({ itemId })}>
            <Flag {...ICON} />
            Report
          </Button>
        ) : null}
      </div>
      {isConfirming ? <p className="fh-hint">It goes for everyone, with its files, upvotes and reviews.{isAdmin && !isMine ? " This goes in the audit log." : ""}</p> : null}
      {error ? (
        <p role="alert" className="fh-hint fh-err">
          {error.message}
        </p>
      ) : done ? (
        <p role="status" className="fh-hint">
          {done.message}
        </p>
      ) : null}
    </div>
  );
}
