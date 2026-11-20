"use client";

import { useMutation } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SetRow } from "@/components/ui/rows";
import { Switch } from "@/components/ui/switch";

import { setModuleStateRequest } from "../queries-modules";
import { ConfirmDialog } from "./confirm-dialog";

export type Feature = {
  id: string;
  label: string;
  description: string;
  // One line in view beside the name ("Needs a voice server"); the description waits behind the name's info button.
  note: string | null;
  icon: ReactNode;
  needsVillage: boolean;
  turnOffNote: string | null;
  isOn: boolean;
  missingRequirement: { id: string; label: string } | null;
  dependentLabels: string[];
};

function toCardId(moduleId: string) {
  return `feature-card-${moduleId}`;
}

type ChangeHandler = (moduleId: string, message: string) => void;

function TurnOffSwitch({ feature, onChanged }: { feature: Feature; onChanged: ChangeHandler }) {
  const { id, label, dependentLabels, turnOffNote } = feature;
  return (
    <ConfirmDialog
      trigger={<Switch checked aria-label={label} />}
      title={`Turn off ${label}?`}
      confirmLabel={`Turn off ${label}`}
      pendingLabel="Turning off…"
      fallbackFocusId={toCardId(id)}
      action={() => setModuleStateRequest({ moduleId: id, isOn: false })}
      onDone={({ message }) => onChanged(id, message)}
    >
      <p>Members won&apos;t see it anymore. Nothing is deleted, and it all comes back when you turn it on again.</p>
      {dependentLabels.length > 0 ? <p>This also pauses {dependentLabels.join(" and ")}, which needs {label}.</p> : null}
      {turnOffNote ? <p>{turnOffNote}</p> : null}
    </ConfirmDialog>
  );
}

function useTurnOn(moduleId: string, onChanged: ChangeHandler) {
  return useMutation({
    mutationFn: () => setModuleStateRequest({ moduleId, isOn: true }),
    onSuccess: ({ message }) => onChanged(moduleId, message),
  });
}

function TurnOnSwitch({ feature, onChanged }: { feature: Feature; onChanged: ChangeHandler }) {
  const turnOn = useTurnOn(feature.id, onChanged);
  return (
    <div className="grid justify-items-end gap-2">
      <Switch checked={false} aria-label={feature.label} disabled={turnOn.isPending} onCheckedChange={() => turnOn.mutate()} />
      <FormError message={turnOn.error?.message ?? null} />
    </div>
  );
}

function TurnOnRequirementButton({ requirement, onChanged }: { requirement: { id: string; label: string }; onChanged: ChangeHandler }) {
  const turnOn = useTurnOn(requirement.id, onChanged);
  return (
    <div className="grid justify-items-end gap-2">
      <Button type="button" variant="secondary" size="sm" className="whitespace-nowrap" disabled={turnOn.isPending} onClick={() => turnOn.mutate()}>
        {turnOn.isPending ? "Turning on…" : `Turn on ${requirement.label}`}
      </Button>
      <FormError message={turnOn.error?.message ?? null} />
    </div>
  );
}

function FeatureAction({ feature, onChanged }: { feature: Feature; onChanged: ChangeHandler }) {
  if (feature.missingRequirement) return <TurnOnRequirementButton requirement={feature.missingRequirement} onChanged={onChanged} />;
  return feature.isOn ? <TurnOffSwitch feature={feature} onChanged={onChanged} /> : <TurnOnSwitch feature={feature} onChanged={onChanged} />;
}

// One setting row per feature: its name, its note when it has one, and its switch. The name's info button shows the
// one-line description on hover (its title) or tap. A feature paused because what it needs is off says so, and
// offers to turn that on instead of a switch.
function FeatureRow({ feature, onChanged }: { feature: Feature; onChanged: ChangeHandler }) {
  const { id, label, description, note, needsVillage, missingRequirement } = feature;
  const [isHintShown, setIsHintShown] = useState(false);
  const hint = `${description}${needsVillage ? " Needs a Village account." : ""}`;
  return (
    <li id={toCardId(id)} tabIndex={-1} className="rounded-sm border-b border-rule outline-offset-2 last:border-b-0 [&_.fh-setrow]:border-b-0">
      <SetRow
        label={
          <span className="inline-flex items-center gap-1.5">
            {label}
            <button
              type="button"
              className="inline-flex size-6 items-center justify-center rounded-full text-graphite hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
              title={hint}
              aria-label={`About ${label}`}
              aria-expanded={isHintShown}
              onClick={(event) => {
                // The button sits in the row's label: a tap shows the line, it never flips the switch.
                event.preventDefault();
                setIsHintShown((shown) => !shown);
              }}
            >
              <Info aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </span>
        }
        hint={
          note || isHintShown || missingRequirement ? (
            <>
              {note ? <span className="block">{note}</span> : null}
              {isHintShown ? <span className="block">{hint}</span> : null}
              {missingRequirement ? <span className="mt-0.5 font-semibold text-ribbon">Paused: needs {missingRequirement.label}</span> : null}
            </>
          ) : undefined
        }
        control={<FeatureAction feature={feature} onChanged={onChanged} />}
      />
    </li>
  );
}

export function FeatureScreen({ features }: { features: Feature[] }) {
  const router = useRouter();
  const [announcement, setAnnouncement] = useState("");

  function handleChanged(moduleId: string, message: string) {
    setAnnouncement(message);
    document.getElementById(toCardId(moduleId))?.focus();
    router.refresh();
  }

  return (
    <Card className="fh-sheet max-w-2xl">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <ul aria-label="Features you can turn on and off">
        {features.map((feature) => (
          <FeatureRow key={feature.id} feature={feature} onChanged={handleChanged} />
        ))}
      </ul>
    </Card>
  );
}
