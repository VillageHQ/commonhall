"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { ASKS_ADMIN_PAGE } from "@/modules/asks/contract";
import { closeAskAsAdminRequest, pinAskRequest, removeAskRequest } from "@/modules/asks/queries";

// After an action the page reloads with Commonhall's flash (?m=pin, ?m=close…).
function useLandWithFlash() {
  const router = useRouter();
  return (flash: string) => {
    router.replace(`${ASKS_ADMIN_PAGE}?m=${flash}`, { scroll: false });
    router.refresh();
  };
}

type AskRowActionsProps = { askId: string; title: string; isPinned: boolean; canPin: boolean; canClose: boolean };

// Pin / Unpin · Close · Remove: quiet small buttons at the end of each row.
export function AskRowActions({ askId, title, isPinned, canPin, canClose }: AskRowActionsProps) {
  const land = useLandWithFlash();
  const pin = useMutation({ mutationFn: () => pinAskRequest({ askId, isPinned: !isPinned }), onSuccess: () => land(isPinned ? "unpin" : "pin") });
  const close = useMutation({ mutationFn: () => closeAskAsAdminRequest(askId), onSuccess: () => land("close") });
  const remove = useMutation({ mutationFn: () => removeAskRequest(askId), onSuccess: () => land("remove") });
  const isBusy = pin.isPending || close.isPending || remove.isPending;
  const error = pin.error ?? close.error ?? remove.error;
  const about = title.slice(0, 60);
  return (
    <span>
      {canPin ? (
        <Button type="button" variant="quiet" size="sm" disabled={isBusy} aria-label={`${isPinned ? "Unpin" : "Pin"}: ${about}`} onClick={() => pin.mutate()}>
          {isPinned ? "Unpin" : "Pin"}
        </Button>
      ) : null}
      {canClose ? (
        <Button type="button" variant="quiet" size="sm" disabled={isBusy} aria-label={`Close: ${about}`} onClick={() => close.mutate()}>
          Close
        </Button>
      ) : null}
      <Button
        type="button"
        variant="quiet"
        size="sm"
        disabled={isBusy}
        aria-label={`Remove: ${about}`}
        onClick={() => {
          if (window.confirm("Remove this for everyone? It stays in the audit log.")) remove.mutate();
        }}
      >
        Remove
      </Button>
      {error ? <FormError message={error.message} /> : null}
    </span>
  );
}
