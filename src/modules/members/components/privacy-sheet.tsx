"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { OptionCard } from "@/components/ui/checkbox-card";
import { SetRow } from "@/components/ui/rows";
import { Switch } from "@/components/ui/switch";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { COMMUNITY_MESSAGE_POLICY, MESSAGE_POLICIES, type MessagePolicy, type PrivacyBody } from "@/modules/members/contract-privacy";

const VISIBILITY = { all: "all", none: "none" } as const;
const ASKS_SWITCH_ID = "privacy-accepts-asks";

const COMMUNITY_DEFAULT_WORDS: Record<string, string> = {
  [MESSAGE_POLICIES.anyone]: "anyone",
  [MESSAGE_POLICIES.introduced]: "people you were introduced to",
};

function savePrivacy(body: PrivacyBody) {
  return postRequest(API_ROUTES.profilePrivacy, body, acknowledgedResponseSchema);
}

type PrivacySheetProps = {
  communityName: string;
  isHidden: boolean;
  // Null while intros are off: the intro asks row is not offered. Never answered counts as yes.
  acceptsIntroAsks: boolean | null;
  // Null while messages are off: "Who can message me" is not offered.
  messagePolicy: MessagePolicy | null;
};

// My profile › Privacy (/me/privacy): who sees me in People, intro asks, who can message me, one Save.
export function PrivacySheet({ communityName, isHidden, acceptsIntroAsks, messagePolicy }: PrivacySheetProps) {
  const router = useRouter();
  const flash = useFlash();
  const [visibility, setVisibility] = useState<string>(isHidden ? VISIBILITY.none : VISIBILITY.all);
  const [acceptsAsks, setAcceptsAsks] = useState(acceptsIntroAsks ?? true);
  const [policy, setPolicy] = useState<MessagePolicy | null>(messagePolicy);
  const save = useMutation({
    mutationFn: savePrivacy,
    onSuccess: () => {
      flash("Privacy settings saved.");
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // "Accept intro asks" is a consent choice with its own date: it is saved only when the member changes it.
    const asksChanged = acceptsIntroAsks !== null && acceptsAsks !== acceptsIntroAsks;
    const policyChanged = policy !== null && policy !== messagePolicy;
    save.mutate({
      isHidden: visibility === VISIBILITY.none,
      ...(asksChanged ? { acceptsIntroAsks: acceptsAsks } : {}),
      ...(policyChanged ? { messagePolicy: policy } : {}),
    });
  }

  const radio = (value: MessagePolicy, title: string, description?: string) => (
    <OptionCard
      id={`dm-policy-${value}`}
      name="dm_policy"
      value={value}
      checked={policy === value}
      onChange={() => setPolicy(value)}
      title={title}
      description={description}
    />
  );

  return (
    <form className="fh-sheet" id="privacy" aria-label="Privacy" onSubmit={submit}>
      <fieldset>
        <legend className="fh-label">Show me in People to</legend>
        <div className="mt-2">
          <OptionCard
            id="privacy-visibility-all"
            name="visibility"
            value={VISIBILITY.all}
            checked={visibility === VISIBILITY.all}
            onChange={() => setVisibility(VISIBILITY.all)}
            title={`Everyone in ${communityName}`}
            description="Never your email address"
          />
          <OptionCard
            id="privacy-visibility-none"
            name="visibility"
            value={VISIBILITY.none}
            checked={visibility === VISIBILITY.none}
            onChange={() => setVisibility(VISIBILITY.none)}
            title="Nobody"
            description="Admins still see you"
          />
        </div>
      </fieldset>
      {acceptsIntroAsks === null ? null : (
        <SetRow
          htmlFor={ASKS_SWITCH_ID}
          label="Let members ask me for intros"
          hint="You approve each one."
          control={<Switch id={ASKS_SWITCH_ID} checked={acceptsAsks} onCheckedChange={setAcceptsAsks} />}
        />
      )}
      {policy === null ? null : (
        <fieldset className="mt-3.5">
          <legend className="fh-label">Who can message me</legend>
          <div className="mt-2">
            {radio(MESSAGE_POLICIES.communityDefault, "The community’s default", `Now: ${COMMUNITY_DEFAULT_WORDS[COMMUNITY_MESSAGE_POLICY]}`)}
            {radio(MESSAGE_POLICIES.anyone, `Anyone in ${communityName}`)}
            {radio(MESSAGE_POLICIES.introduced, "Only people I’ve been introduced to", "Admins can always write")}
          </div>
        </fieldset>
      )}
      <FormError message={save.error?.message ?? null} />
      <div className="fh-btn-row mt-3">
        <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
          Save privacy
        </Button>
      </div>
    </form>
  );
}
