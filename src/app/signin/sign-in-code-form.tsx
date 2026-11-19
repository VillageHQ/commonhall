"use client";

import { useActionState } from "react";
import { z } from "zod";

import { Field } from "@/components/form-field";
import { Button, ButtonRow } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";
import { postRequest } from "@/platform/http/post-request";

const signedInSchema = z.object({ isPasswordRemoved: z.boolean() });
const FAILED_MESSAGE = "That code didn't work. Check the newest email, or ask for a new one.";
const CODE_ID = "sign-in-code";
const ERROR_ID = "sign-in-code-error";

type CodeState = { isPasswordRemoved: boolean; errorMessage: string | null };

const INITIAL_STATE: CodeState = { isPasswordRemoved: false, errorMessage: null };

async function signInWithCode(email: string, returnPath: string, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  try {
    const { isPasswordRemoved } = await postRequest(API_ROUTES.signInCode, { email, code }, signedInSchema, FAILED_MESSAGE);
    if (!isPasswordRemoved) window.location.assign(returnPath);
    return { isPasswordRemoved, errorMessage: null };
  } catch (error) {
    return { isPasswordRemoved: false, errorMessage: error instanceof Error ? error.message : FAILED_MESSAGE };
  }
}

// The 6-digit code from the same email as the link: the phone app's way in (an emailed link opens the browser).
export function SignInCodeForm({ email, returnPath }: { email: string; returnPath: string | null }) {
  const [state, formAction, isPending] = useActionState(
    (_previousState: CodeState, formData: FormData) => signInWithCode(email, returnPath ?? ROUTES.landing, formData),
    INITIAL_STATE,
  );

  if (state.isPasswordRemoved) {
    return (
      <div className="mt-[18px]">
        <Note kind="ok">
          You’re signed in, and your email is confirmed. Your old password was set before this email was confirmed, so we removed it to keep the account safe. Add a
          new one on My profile whenever you like.
        </Note>
        <ButtonRow className="mt-4">
          <Button asChild>
            <a href={returnPath ?? ROUTES.landing}>Continue</a>
          </Button>
        </ButtonRow>
      </div>
    );
  }

  const hasError = Boolean(state.errorMessage);
  return (
    <form action={formAction} className="fh-field mt-[18px]" noValidate>
      <Field htmlFor={CODE_ID} label="Or type the 6-digit code from the email" error={state.errorMessage ? <span id={ERROR_ID}>{state.errorMessage}</span> : null}>
        <Input
          id={CODE_ID}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          placeholder="123456"
          required
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? ERROR_ID : undefined}
        />
      </Field>
      <Button type="submit" width="block" disabled={isPending} className="mt-[14px]">
        {isPending ? "Signing in…" : "Sign in with the code"}
      </Button>
    </form>
  );
}
