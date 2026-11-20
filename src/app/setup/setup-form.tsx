"use client";

import { useActionState } from "react";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { useFocusOnFailure } from "@/components/use-focus-on-failure";
import { MAXIMUM_PASSWORD_LENGTH, MINIMUM_PASSWORD_LENGTH } from "@/platform/auth/password-policy";
import { authClient } from "@/platform/auth/auth-client";
import { MAXIMUM_COMMUNITY_NAME_LENGTH } from "@/platform/branding/branding-api";
import { readResponseMessage } from "@/platform/http/read-response-message";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";

type SetupState = { errorMessage: string | null; communityName: string; name: string; email: string };

const INITIAL_STATE: SetupState = { errorMessage: null, communityName: "", name: "", email: "" };
const FALLBACK_ERROR_MESSAGE = "Setup failed. Try again.";
// The README's "Setup token" section.
const SETUP_TOKEN_GUIDE_URL = "https://github.com/VillageHQ/commonhall#setup-token";

async function submitSetup(_previousState: SetupState, formData: FormData): Promise<SetupState> {
  const response = await fetch(API_ROUTES.setup, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.fromEntries(formData)),
  });
  if (!response.ok) {
    return {
      errorMessage: await readResponseMessage(response, FALLBACK_ERROR_MESSAGE),
      communityName: String(formData.get("communityName")),
      name: String(formData.get("name")),
      email: String(formData.get("email")),
    };
  }

  // Signed in at once with the same email and password, then on to the guided start (via the landing). If that sign-in
  // fails, the sign-in page asks for them once more.
  const { error } = await authClient.signIn.email({ email: String(formData.get("email")), password: String(formData.get("password")) });
  window.location.assign(error ? ROUTES.signInAsNewAdmin : ROUTES.landing);
  return INITIAL_STATE;
}

// The community's name and the first admin, on one screen: invitees see the name from their first link.
export function SetupForm({ communityName = "" }: { communityName?: string }) {
  const [state, formAction, isPending] = useActionState(submitSetup, { ...INITIAL_STATE, communityName });
  const tokenRef = useFocusOnFailure(state);

  return (
    <form action={formAction} className="fh-field grid gap-4">
      <FormError message={state.errorMessage} />
      <FormField
        ref={tokenRef}
        name="token"
        label="Setup token"
        type="password"
        autoComplete="off"
        hint={
          <>
            Whoever installed this app chose it: it is SETUP_TOKEN in the server&apos;s settings.{" "}
            <a href={SETUP_TOKEN_GUIDE_URL} target="_blank" rel="noreferrer">
              Where to find it
            </a>
          </>
        }
        required
      />
      <FormField
        name="communityName"
        label="Community name"
        autoComplete="organization"
        maxLength={MAXIMUM_COMMUNITY_NAME_LENGTH}
        defaultValue={state.communityName}
        hint="Founders see it on their invite and every page, e.g. Northwind Founders."
        required
      />
      <FormField
        name="name"
        label="Your name"
        autoComplete="name"
        defaultValue={state.name}
        required
      />
      <FormField
        name="email"
        label="Your email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        required
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={MINIMUM_PASSWORD_LENGTH}
        maxLength={MAXIMUM_PASSWORD_LENGTH}
        hint={`At least ${MINIMUM_PASSWORD_LENGTH} characters.`}
        required
      />
      <Button type="submit" width="block" disabled={isPending} className="mt-0.5">
        {isPending ? "Creating admin…" : "Create admin"}
      </Button>
    </form>
  );
}
