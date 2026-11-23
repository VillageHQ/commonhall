"use client";

import { useMutation, useQueryClient, type QueryFilters } from "@tanstack/react-query";
import { Ban } from "lucide-react";
import { useState } from "react";

import { FormError } from "@/components/form-error";

import { ConfirmAction } from "@/components/confirm-action";

import { describeBlock } from "@/modules/members/contract-blocks";
import { setBlockRequest } from "@/modules/members/queries-blocks";

type BlockMemberButtonProps = { memberId: string; memberName: string; isBlocked: boolean; refreshesAfterChange: QueryFilters };

// "Block <name>" in a profile's "More" sheet (round 8; before, a text button at the page's end): a row that asks
// first, in place; "Unblock <name>" undoes it at once.
export function BlockMemberButton({ memberId, memberName, isBlocked: wasBlocked, refreshesAfterChange }: BlockMemberButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const queryClient = useQueryClient();
  const setBlock = useMutation({
    mutationFn: (isBlocked: boolean) => setBlockRequest({ memberId, isBlocked }),
    onSuccess: () => queryClient.invalidateQueries(refreshesAfterChange),
  });
  const isBlocked = setBlock.data?.isBlocked ?? wasBlocked;

  if (isConfirming) {
    return (
      <div className="fh-person-confirm">
        <ConfirmAction
          message={describeBlock(memberName)}
          confirmLabel={`Block ${memberName}`}
          pendingLabel="Blocking…"
          cancelLabel="Never mind"
          isPending={setBlock.isPending}
          errorMessage={setBlock.error?.message ?? null}
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => setBlock.mutate(true, { onSuccess: () => setIsConfirming(false) })}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="fh-person-menu-row"
        data-tone={isBlocked ? undefined : "danger"}
        disabled={setBlock.isPending}
        onClick={() => (isBlocked ? setBlock.mutate(false) : setIsConfirming(true))}
      >
        <Ban aria-hidden="true" strokeWidth={1.5} />
        <span>{isBlocked ? `Unblock ${memberName}` : `Block ${memberName}`}</span>
      </button>
      {isBlocked ? <p className="fh-person-menu-note">You blocked this member. They haven&apos;t been told.</p> : null}
      <FormError message={setBlock.error?.message ?? null} />
    </>
  );
}
