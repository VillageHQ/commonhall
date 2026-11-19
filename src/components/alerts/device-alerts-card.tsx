"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { isInNativeApp, subscribeToNativeApp } from "@/platform/native-app/bridge";
import { DEVICE_STATES, readDeviceState, sendTestAlert, turnOffAlerts, turnOnAlerts, type DeviceState } from "./push-client";

const STATE_WORDS: Record<DeviceState, string> = {
  unsupported: "This browser can’t show alerts. Try Chrome, Edge, Firefox or Safari.",
  needs_install: "On iPhone and iPad, alerts work once the app is on your home screen: tap Share, then Add to Home Screen, and open it from there.",
  blocked: "Alerts are blocked for this site in your browser’s settings. Allow them there, then come back.",
  off: "Alerts are off on this device.",
  on: "Alerts are on for this device.",
};
const IN_APP_WORDS = "In the Commonhall app, this phone’s alerts come from the app: allow them when it asks, or in the phone’s settings.";

// "This device": turn alerts on (the only place the browser asks for permission), off, or send a test.
// `isPaused`: the member switched Alerts off below, so this device gets nothing even while subscribed.
export function DeviceAlertsCard({ vapidPublicKey, isPaused }: { vapidPublicKey: string; isPaused: boolean }) {
  const flash = useFlash();
  // The phone app handles its own alerts (Expo push), so the browser's switch would only confuse.
  const isApp = useSyncExternalStore(subscribeToNativeApp, isInNativeApp, () => false);
  const [state, setState] = useState<DeviceState | null>(null);
  // A second click before the first finishes would subscribe (or send) twice.
  const isBusy = useRef(false);

  useEffect(() => {
    let isCurrent = true;
    void readDeviceState().then((found) => {
      if (isCurrent) setState(found);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  const change = useMutation({
    mutationFn: (turnOn: boolean) => (turnOn ? turnOnAlerts(vapidPublicKey) : turnOffAlerts()),
    onSettled: () => {
      isBusy.current = false;
    },
    onSuccess: (next) => {
      setState(next);
      if (next === DEVICE_STATES.on) flash("Alerts are on for this device.");
    },
  });
  const test = useMutation({
    mutationFn: sendTestAlert,
    onSettled: () => {
      isBusy.current = false;
    },
    onSuccess: ({ message }) => flash(message),
  });

  function once(run: () => void) {
    if (isBusy.current) return;
    isBusy.current = true;
    run();
  }

  return (
    <section className="fh-sheet" aria-labelledby="device-alerts-title">
      <h2 id="device-alerts-title" className="fh-h3">
        This device
      </h2>
      <p className="fh-small fh-muted mt-1" role="status">
        {isApp ? IN_APP_WORDS : state ? STATE_WORDS[state] : "Checking this device…"}
        {(isApp || state === DEVICE_STATES.on) && isPaused ? " Alerts are switched off below, so nothing comes until you switch them back on." : null}
      </p>
      <div className="fh-btn-row mt-3">
        {isApp ? (
          <Button type="button" variant="primary" size="sm" disabled={test.isPending} onClick={() => once(() => test.mutate())}>
            Send a test alert
          </Button>
        ) : null}
        {!isApp && state === DEVICE_STATES.off ? (
          <Button type="button" variant="primary" size="sm" disabled={change.isPending} onClick={() => once(() => change.mutate(true))}>
            {change.isPending ? "Turning on…" : "Turn on alerts"}
          </Button>
        ) : null}
        {!isApp && state === DEVICE_STATES.on ? (
          <>
            <Button type="button" variant="primary" size="sm" disabled={test.isPending} onClick={() => once(() => test.mutate())}>
              Send a test alert
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={change.isPending} onClick={() => once(() => change.mutate(false))}>
              Turn off on this device
            </Button>
          </>
        ) : null}
      </div>
      <FormError message={change.error?.message ?? test.error?.message ?? null} />
    </section>
  );
}
