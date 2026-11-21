"use client";

import { useActionState, useEffect, useRef } from "react";
import { z } from "zod";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { MAXIMUM_PASSWORD_LENGTH, MINIMUM_PASSWORD_LENGTH } from "@/platform/auth/password-policy";
import { authClient } from "@/platform/auth/auth-client";
import { MAXIMUM_COMMUNITY_NAME_LENGTH } from "@/platform/branding/branding-api";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";

// After a refusal every typed value comes back (React clears a form once its action ends), and the field the answer
// names gets the focus: a blank community name never costs the 64-character token again.
type SetupState = { errorMessage: string | null; field: string; values: Record<string, string> };

const INITIAL_STATE: SetupState = { errorMessage: null, field: "", values: {} };
const failureSchema = z.object({ message: z.string(), field: z.string().optional() });
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
    const failure = failureSchema.safeParse(await response.json().catch(() => null));
    return {
      errorMessage: failure.success ? failure.data.message : FALLBACK_ERROR_MESSAGE,
      field: failure.data?.field || "token",
      values: Object.fromEntries([...formData].map(([key, value]) => [key, String(value)])),
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
  const [state, formAction, isPending] = useActionState(submitSetup, { ...INITIAL_STATE, values: { communityName } });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.errorMessage) formRef.current?.querySelector<HTMLInputElement>(`[name="${state.field}"]`)?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="fh-field grid gap-4">
      <FormError message={state.errorMessage} />
      <FormField
        name="token"
        defaultValue={state.values.token}
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
        defaultValue={state.values.communityName}
        hint="Founders see it on their invite and every page, e.g. Northwind Founders."
        required
      />
      <FormField
        name="name"
        label="Your name"
        autoComplete="name"
        defaultValue={state.values.name}
        required
      />
      <FormField
        name="email"
        label="Your email"
        type="email"
        autoComplete="email"
        defaultValue={state.values.email}
        required
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        defaultValue={state.values.password}
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
