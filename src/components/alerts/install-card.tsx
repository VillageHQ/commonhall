"use client";

import { Share, SquarePlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { isAppleMobile, isInstalled, registerServiceWorker } from "./push-client";

const DISMISSED_KEY = "commonhall:install-card-dismissed";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const VIEWS = { hidden: "hidden", prompt: "prompt", apple: "apple" } as const;
type View = (typeof VIEWS)[keyof typeof VIEWS];

// Today's "Add <fund> to your home screen": Chrome and Edge's own install prompt, or the Share › Add to Home Screen
// steps on iPhone. Gone once installed or dismissed (on this browser). It never asks for alert permission.
export function InstallCard({ communityName, alertsHref }: { communityName: string; alertsHref: string }) {
  const isInBrowser = useIsInBrowser();
  const [promptView, setView] = useState<View>(VIEWS.hidden);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const isWanted = isInBrowser && !isDismissed && !isInstalled() && !window.localStorage.getItem(DISMISSED_KEY);
  const view = !isWanted ? VIEWS.hidden : isAppleMobile() ? VIEWS.apple : promptView;

  useEffect(() => {
    void registerServiceWorker().catch(() => null);
    function offer(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      setView(VIEWS.prompt);
    }
    function installed() {
      setView(VIEWS.hidden);
    }
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (view === VIEWS.hidden) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, "1");
    setIsDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === "accepted") setView(VIEWS.hidden);
  }

  return (
    <section aria-labelledby="install-card-title" className="fh-sheet mb-4" data-testid="install-card">
      <div className="flex items-start justify-between gap-3">
        <h2 id="install-card-title" className="fh-h3">
          Add {communityName} to your home screen
        </h2>
        <button type="button" className="fh-linkbtn" aria-label="Hide this" onClick={dismiss}>
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      {view === VIEWS.apple ? (
        <ol className="fh-small mt-2 grid gap-1.5">
          <li className="flex items-center gap-2">
            1. Tap <Share aria-hidden="true" className="size-4" /> Share in Safari’s toolbar.
          </li>
          <li className="flex items-center gap-2">
            2. Tap <SquarePlus aria-hidden="true" className="size-4" /> Add to Home Screen, then Add.
          </li>
          <li>
            3. Open {communityName} from your home screen and turn on alerts in <Link href={alertsHref}>Alerts</Link>.
          </li>
        </ol>
      ) : (
        <>
          <p className="fh-small mt-1">It opens like an app, and can alert you to intro asks and messages.</p>
          <div className="fh-btn-row mt-3">
            <Button type="button" variant="primary" size="sm" onClick={() => void install()}>
              Install
            </Button>
            <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={alertsHref}>
              Alert settings
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
