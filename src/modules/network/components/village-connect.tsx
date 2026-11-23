"use client";

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { ExternalTextLink } from "@/components/external-text-link";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES } from "@/platform/http/routes";
import { villageConnectLinks } from "@/platform/village/links";

import { villageKeysResponseSchema } from "../contract-village-admin";

// Connect Village (Set up › Village's Connection part, and step 2 of the guided start): three links to Village's
// pages, two paste boxes, and no Save button. As soon as both boxes hold a value the keys are checked with Village and
// saved (POST /api/admin/village/keys); the answer shows under the boxes.

const CHECK_DELAY_MS = 600;
const FALLBACK_APP_NAME = "your Village app";

type Keys = { secretKey: string; publicKey: string };
type Result = { kind: "checking" } | { kind: "failed"; message: string } | null;

type VillageConnectProps = {
  // VILLAGE_APP_URL as the server resolved it (default https://village.ai).
  appUrl: string;
  // Set when this site already holds keys it can read: the screen starts folded. An empty string means "connected,
  // name unknown" (keys saved before the name was kept).
  connectedAppName: string | null;
  // Called once the keys are checked and saved. The guided start turns its "Next" on with it.
  onConnected?: (appName: string) => void;
};

export function VillageConnect({ appUrl, connectedAppName, onConnected }: VillageConnectProps) {
  const router = useRouter();
  const links = villageConnectLinks(appUrl);
  const [connectedName, setConnectedName] = useState(connectedAppName);
  // What Village said about the keys just saved (test keys, or no card yet). Admin › Village's check says it later.
  const [notice, setNotice] = useState<string | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [keys, setKeys] = useState<Keys>({ secretKey: "", publicKey: "" });
  const [result, setResult] = useState<Result>(null);
  const isChecking = useRef(false);
  const nextKeys = useRef<Keys | null>(null);
  async function runCheck(pair: Keys) {
    // One check in flight: a newer pair waits and runs when this one answers.
    if (isChecking.current) {
      nextKeys.current = pair;
      return;
    }
    isChecking.current = true;
    setResult({ kind: "checking" });
    try {
      const { appName, notice: savedNotice } = await postRequest(API_ROUTES.villageKeys, pair, villageKeysResponseSchema);
      // These keys are saved now, even if a box changed meanwhile: the screen says so, and a waiting pair is still
      // checked with the boxes left open (a failure then shows beside "Keep the saved keys").
      setConnectedName(appName);
      setNotice(savedNotice);
      onConnected?.(appName);
      router.refresh();
      if (nextKeys.current) {
        setIsReplacing(true);
      } else {
        setResult(null);
        setIsReplacing(false);
        setKeys({ secretKey: "", publicKey: "" });
      }
    } catch (failure) {
      if (!nextKeys.current) setResult({ kind: "failed", message: failure instanceof Error ? failure.message : "Village couldn't check these keys. Try again." });
    } finally {
      isChecking.current = false;
      const waiting = nextKeys.current;
      nextKeys.current = null;
      if (waiting) void runCheck(waiting);
    }
  }
  const startCheck = useEffectEvent((pair: Keys) => void runCheck(pair));

  useEffect(() => {
    const pair = { secretKey: keys.secretKey.trim(), publicKey: keys.publicKey.trim() };
    if (!pair.secretKey || !pair.publicKey) {
      nextKeys.current = null;
      if (!isChecking.current) setResult(null);
      return;
    }
    const timer = setTimeout(() => startCheck(pair), CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [keys.secretKey, keys.publicKey]);

  const isFolded = connectedName !== null && !isReplacing;
  if (isFolded) {
    return (
      <>
      <p className="fh-small mt-3 flex flex-wrap items-center gap-x-1.5" data-village-connect="connected">
        <CircleCheck aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />
        <span role="status">
          Connected to <b>{connectedName || FALLBACK_APP_NAME}</b>
        </span>
        <span aria-hidden="true">·</span>
        <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setIsReplacing(true)}>
          Replace the keys
        </Button>
      </p>
      {notice ? (
        <Note kind="needs" className="mt-2" data-village-keys-notice="">
          {notice}
        </Note>
      ) : null}
      </>
    );
  }

  return (
    <div className="mt-3 grid gap-3" data-village-connect="open">
      <p className="fh-small">Village shows which members know whom, so they can ask each other for warm intros.</p>
      <ol className="fh-small grid list-decimal gap-1.5 pl-5">
        <li>
          <ExternalTextLink href={links.account}>Create a developer account</ExternalTextLink>
        </li>
        <li>
          <ExternalTextLink href={links.checklist}>Finish Village&apos;s short checklist</ExternalTextLink>
        </li>
        <li>
          <ExternalTextLink href={links.apiKeys}>Open your keys page</ExternalTextLink> and copy both keys
        </li>
      </ol>
      <Field htmlFor="village-secret-key" label="Paste the secret key" className="fh-field">
        <Input
          id="village-secret-key"
          autoFocus={isReplacing}
          name="secretKey"
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="fh-mono"
          value={keys.secretKey}
          onChange={(event) => setKeys((current) => ({ ...current, secretKey: event.target.value }))}
        />
      </Field>
      <Field htmlFor="village-public-key" label="Paste the public key" className="fh-field">
        <Input
          id="village-public-key"
          name="publicKey"
          autoComplete="off"
          spellCheck={false}
          className="fh-mono"
          value={keys.publicKey}
          onChange={(event) => setKeys((current) => ({ ...current, publicKey: event.target.value }))}
        />
      </Field>
      <div aria-live="polite">
        {result?.kind === "checking" ? <p className="fh-small fh-muted">Checking the keys with Village…</p> : null}
        {result?.kind === "failed" ? (
          <Note kind="needs" role="alert">
            {result.message}
          </Note>
        ) : null}
      </div>
      {connectedName !== null ? (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setIsReplacing(false);
              setKeys({ secretKey: "", publicKey: "" });
              setResult(null);
            }}
          >
            Keep the saved keys
          </Button>
        </div>
      ) : null}
    </div>
  );
}
