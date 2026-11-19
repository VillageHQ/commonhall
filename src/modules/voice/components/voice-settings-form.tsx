"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { VOICE_SOURCES, type VoiceSettingsView } from "../contract";
import { voiceRequests } from "../queries";

// Set up › Rooms: LiveKit Cloud keys (or any LiveKit server's). The server's own LiveKit, set by the installer,
// wins, so the form only shows when there is none.
export function VoiceSettingsForm({ view }: { view: VoiceSettingsView }) {
  const router = useRouter();
  const flash = useFlash();
  const [url, setUrl] = useState(view.source === VOICE_SOURCES.server ? "" : (view.url ?? ""));
  const [apiKey, setApiKey] = useState(view.source === VOICE_SOURCES.server ? "" : (view.apiKey ?? ""));
  const [apiSecret, setApiSecret] = useState("");
  const save = useMutation({
    mutationFn: voiceRequests.saveSettings,
    onSuccess: () => {
      setApiSecret("");
      flash("Settings saved.");
      router.refresh();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({ url, apiKey, apiSecret });
  }

  return (
    <Card className="fh-sheet">
      <form onSubmit={submit}>
        <h2 className="type-h3">LiveKit Cloud keys</h2>
        <p className="fh-small fh-muted mt-1.5">
          Use these if you don&rsquo;t run LiveKit on this server. In LiveKit Cloud, open your project&rsquo;s Settings › Keys and paste them here.
        </p>
        <Field htmlFor="voice-url" label="LiveKit address" className="fh-field" hint="Starts with wss://, like wss://yourfund.livekit.cloud">
          <Input id="voice-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="wss://yourfund.livekit.cloud" autoComplete="off" />
        </Field>
        <Field htmlFor="voice-key" label="API key" className="fh-field">
          <Input id="voice-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
        </Field>
        <Field
          htmlFor="voice-secret"
          label="API secret"
          className="fh-field"
          hint={
            view.hasSecret && view.source !== VOICE_SOURCES.server
              ? "Saved. Leave empty to keep it."
              : view.secretStorage === "unencrypted"
                ? "This server has no setup token, so the secret is stored unencrypted."
                : "Stored encrypted with your setup token."
          }
        >
          <Input id="voice-secret" type="password" value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} autoComplete="new-password" />
        </Field>
        {save.error ? (
          <p className="fh-hint fh-err" role="alert">
            {save.error.message}
          </p>
        ) : null}
        <div className="fh-btn-row mt-4">
          <Button type="submit" variant="ink" disabled={save.isPending || view.secretStorage === "refused"}>
            Save keys
          </Button>
        </div>
      </form>
    </Card>
  );
}
