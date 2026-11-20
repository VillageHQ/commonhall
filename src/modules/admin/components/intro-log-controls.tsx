"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";

import { FormError } from "@/components/form-error";
import { useFlash } from "@/components/flash";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ASK_ALLOWANCE } from "@/modules/asks/contract";
import { saveAllowanceRequest } from "@/modules/asks/queries";
import { OUTCOME_DAYS } from "@/modules/intros/contract-outcome-days";

import { INTRO_LOG_FLASH } from "../contract-intro-log";
import { downloadIntroLogCsv, saveOutcomeDaysRequest } from "../queries-intro-log";

// The Intro log's CSV button: the log of the period on screen, as a file.
export function IntroLogCsvButton({ period }: { period: string }) {
  const download = useMutation({ mutationFn: () => downloadIntroLogCsv(period) });
  return (
    <>
      <Button type="button" variant="secondary" size="sm" disabled={download.isPending} onClick={() => download.mutate()}>
        <Download aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
        CSV
      </Button>
      {download.error ? <FormError message={download.error.message} /> : null}
    </>
  );
}

type NumberSettingProps = {
  id: string;
  title: string;
  label: string;
  name: string;
  value: number;
  minimum: number;
  maximum: number;
  hint: ReactNode;
  save: (value: number) => Promise<unknown>;
  flash: string;
  className?: string;
};

// One number and Save (Commonhall's `.pair`). It sits inside Set up's settings form, so it is no form of its own:
// Save and Enter send just this number. After saving, the flash says so at the top.
function NumberSetting({ id, title, label, name, value, minimum, maximum, hint, save, flash, className }: NumberSettingProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const showFlash = useFlash();
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      showFlash(flash);
      router.refresh();
      window.scrollTo({ top: 0 });
    },
  });
  const inputId = `${id}-value`;
  const [inputError, setInputError] = useState<string | null>(null);
  const isSending = useRef(false);
  function submit() {
    if (isSending.current) return;
    const number = Number(inputRef.current?.value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) {
      setInputError(`A whole number from ${minimum} to ${maximum}.`);
      return;
    }
    setInputError(null);
    isSending.current = true;
    mutation.mutate(number, { onSettled: () => (isSending.current = false) });
  }
  return (
    <Card id={id} className={className}>
      <section aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className="fh-h3">
          {title}
        </h2>
        <div className="fh-pair mt-2.5 items-end">
          <div>
            <label className="fh-label fh-small" htmlFor={inputId}>
              {label}
            </label>
            <Input
              ref={inputRef}
              id={inputId}
              name={name}
              type="number"
              inputMode="numeric"
              min={minimum}
              max={maximum}
              step={1}
              defaultValue={value}
              aria-invalid={mutation.isError || inputError !== null || undefined}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                submit();
              }}
            />
          </div>
          <div>
            <Button type="button" variant="secondary" size="sm" disabled={mutation.isPending} onClick={submit}>
              Save
            </Button>
          </div>
        </div>
        {inputError || mutation.error ? <FormError message={inputError ?? mutation.error?.message ?? null} /> : null}
        <p className="fh-hint">{hint}</p>
      </section>
    </Card>
  );
}

export function AskAllowanceSetting({ weeklyAllowance }: { weeklyAllowance: number }) {
  return (
    <NumberSetting
      id="limits"
      className="fh-section"
      title="Asks a week"
      label="Per member"
      name="weeklyAllowance"
      value={weeklyAllowance}
      minimum={ASK_ALLOWANCE.minimum}
      maximum={ASK_ALLOWANCE.maximum}
      hint={`Asks and intro asks share it. Default ${ASK_ALLOWANCE.default}.`}
      save={saveAllowanceRequest}
      flash={INTRO_LOG_FLASH.limits}
    />
  );
}

export function OutcomeDaysSetting({ outcomeDays }: { outcomeDays: number }) {
  return (
    <NumberSetting
      id="outcome"
      className="mt-4"
      title="Outcome question"
      label="Days after an intro"
      name="outcomeDays"
      value={outcomeDays}
      minimum={OUTCOME_DAYS.minimum}
      maximum={OUTCOME_DAYS.maximum}
      hint={`When the asker gets “Was it helpful?”. Default ${OUTCOME_DAYS.default}.`}
      save={saveOutcomeDaysRequest}
      flash={INTRO_LOG_FLASH.outcomeDays}
    />
  );
}
