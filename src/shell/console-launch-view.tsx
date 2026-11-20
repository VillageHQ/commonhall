import { Check } from "lucide-react";

import { TextLink } from "@/shell/console-home-parts";
import type { LaunchStep } from "@/shell/console-launch";
import { ROUTES } from "@/platform/http/routes";

// The console's Home before launch (Commonhall's launch checklist): four steps, in order, each with its status.
export function ConsoleLaunchView({ firstName, steps }: { firstName: string; steps: readonly LaunchStep[] }) {
  return (
    <>
      <div className="fh-pagehead">
        <h1 className="fh-h1 fh-launch-h">{firstName ? `Welcome, ${firstName}. Four steps to launch.` : "Welcome. Four steps to launch."}</h1>
      </div>
      <section className="fh-sheet fh-launch" aria-label="Launch checklist">
        <ol className="fh-launch-list">
          {steps.map((step) => (
            <li key={step.key} className={step.isDone ? "fh-done" : undefined} data-step={step.key}>
              {step.isDone ? (
                <span className="fh-lk fh-done">
                  <Check aria-hidden="true" />
                </span>
              ) : (
                <span className="fh-lk" />
              )}
              <div>
                <b>{step.title}</b>
                <p>
                  {step.text.map((part, index) =>
                    "href" in part ? (
                      <TextLink key={index} href={part.href}>
                        {part.text}
                      </TextLink>
                    ) : (
                      <span key={index}>{part.text}</span>
                    ),
                  )}
                </p>
              </div>
              <span className="fh-sr">{step.isDone ? "Done" : "Not done yet"}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="fh-small fh-muted fh-launch-foot">
        Everything else is in <TextLink href={ROUTES.adminSettings}>Set up</TextLink>.
      </p>
    </>
  );
}
