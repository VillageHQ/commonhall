"use client";

import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useFlash } from "@/components/flash";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SourceBadge } from "@/components/ui/tag";
import { Textarea } from "@/components/ui/textarea";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";
import { OWN_FIELD_KEYS, type OwnFieldKey } from "@/modules/members/contract-own-words";


// Commonhall's "In your own words" (member-me-profile): one ruled block per field; "Edit card" opens them all as one
// form with one Save. A line filled in from public profiles carries that badge; the member's own words carry none.

export type OwnField = {
  key: OwnFieldKey;
  label: string;
  // The member's own words, or "" when they wrote none.
  ownValue: string;
  // What shows when they wrote none: a line filled in from public profiles.
  filledValue: string | null;
  isLong?: boolean;
  isSerif?: boolean;
  maxLength: number;
  hint?: string;
};

// Which field of the profile body each block saves.
const BODY_KEY_OF: Record<OwnFieldKey, string> = {
  name: "name",
  role: "title",
  company: "company",
  city: "location",
  stage: "stage",
  sector: "sector",
  cohort: "cohort",
  working_on: "bio",
  can_help_with: "canHelpWith",
  looking_for: "needs",
  tags: "tags",
  linkedin: "linkedinUrl",
  website: "website",
};

function toBody(key: OwnFieldKey, value: string) {
  if (key === OWN_FIELD_KEYS.tags) {
    return { tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) };
  }
  return { [BODY_KEY_OF[key]]: value };
}

function saveCard(body: Record<string, unknown>) {
  return postRequest(API_ROUTES.profile, body, acknowledgedResponseSchema);
}

// What "?edit=" opens on: a field's key focuses that field (a Correct link), anything else ("card") the first one.
function readFocusKey(asked: string, fields: readonly OwnField[]) {
  return fields.find(({ key }) => key === asked)?.key ?? fields[0]?.key ?? null;
}

function FieldInput({ field, value, onChange, isFocused }: { field: OwnField; value: string; onChange: (value: string) => void; isFocused: boolean }) {
  const control = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    if (isFocused) control.current?.focus();
  }, [isFocused]);
  const id = `own-${field.key}`;
  return (
    <div className="fh-fieldblock fh-editing" id={`f-${field.key}`}>
      <label className="fh-k" htmlFor={id}>
        {field.label}
      </label>
      <div className="fh-edit">
        {field.isLong ? (
          <Textarea ref={control} id={id} value={value} maxLength={field.maxLength} className="min-h-[84px]" onChange={(event) => onChange(event.target.value)} />
        ) : (
          <Input ref={control} id={id} value={value} maxLength={field.maxLength} onChange={(event) => onChange(event.target.value)} />
        )}
        {field.hint ? <p className="fh-hint">{field.hint}</p> : null}
      </div>
    </div>
  );
}

function CardEditor({ fields, focusKey, onDone }: { fields: readonly OwnField[]; focusKey: string | null; onDone: () => void }) {
  const router = useRouter();
  const flash = useFlash();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(({ key, ownValue }) => [key, ownValue])));
  const save = useMutation({
    mutationFn: saveCard,
    onSuccess: () => {
      flash("Your card is saved.");
      onDone();
      router.replace(ROUTES.editCard, { scroll: false });
      router.refresh();
    },
  });

  function close() {
    onDone();
    router.replace(ROUTES.editCard, { scroll: false });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Only the fields the member changed are sent, so an untouched field keeps exactly what it holds.
    const changed = fields.filter(({ key, ownValue }) => values[key] !== ownValue);
    if (changed.length === 0) {
      close();
      return;
    }
    save.mutate(Object.assign({}, ...changed.map(({ key }) => toBody(key, values[key] ?? ""))));
  }

  return (
    <form aria-label="Edit card" onSubmit={submit}>
      {fields.map((field) => (
        <FieldInput
          key={field.key}
          field={field}
          value={values[field.key] ?? ""}
          isFocused={field.key === focusKey}
          onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
        />
      ))}
      <FormError message={save.error?.message ?? null} />
      <div className="fh-btn-row mt-3">
        <Button type="submit" variant="primary" size="sm" disabled={save.isPending}>
          Save
        </Button>
        <Button type="button" variant="quiet" size="sm" onClick={close}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function FieldRow({ field }: { field: OwnField }) {
  const shownValue = field.ownValue || field.filledValue;
  const isFilledIn = !field.ownValue && Boolean(field.filledValue);
  return (
    <div className="fh-fieldblock" id={`f-${field.key}`}>
      <div className="fh-k">
        <span>
          {field.label} {isFilledIn ? <SourceBadge source="village" /> : null}
        </span>
      </div>
      <p className={cn("fh-v whitespace-pre-line wrap-anywhere", field.isSerif && "fh-serif")}>{shownValue ? shownValue : <span className="fh-muted">Not filled in</span>}</p>
    </div>
  );
}

// Round 7 (less-choice Part 3): one "Edit card" opens every field with one Save (before: an Edit and a Save per field).
// `?edit=<key>` (a Correct link, or the Settings list's My card with "card") opens the editor at that field.
export function OwnWordsSheet({ fields }: { fields: readonly OwnField[] }) {
  const searchParams = useSearchParams();
  const asked = searchParams.get("edit");
  const [focusKey, setFocusKey] = useState<string | null>(asked === null ? null : readFocusKey(asked, fields));
  const [isEditing, setIsEditing] = useState(asked !== null);
  // A Correct link opens the editor, also when the page is already open.
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    if (asked !== null) {
      setIsEditing(true);
      setFocusKey(readFocusKey(asked, fields));
    }
  }
  return (
    <section className="fh-sheet" id="card" aria-label="In your own words">
      <div className="fh-source flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5">
          <Pencil aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
          In your own words
        </span>
        {isEditing ? null : (
          <Button asChild variant="secondary" size="sm">
            <Link
              href={`${ROUTES.editCard}?edit=card`}
              scroll={false}
              onClick={(event) => {
                event.preventDefault();
                setFocusKey(readFocusKey("card", fields));
                setIsEditing(true);
              }}
            >
              Edit card
            </Link>
          </Button>
        )}
      </div>
      {isEditing ? (
        <CardEditor fields={fields} focusKey={focusKey} onDone={() => setIsEditing(false)} />
      ) : (
        fields.map((field) => <FieldRow key={field.key} field={field} />)
      )}
    </section>
  );
}
