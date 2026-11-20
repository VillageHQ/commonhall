"use client";

import { Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Field } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  LIBRARY_API_ROUTES,
  LIBRARY_FILE_ACCEPT,
  LIBRARY_JOB_LABELS,
  LIBRARY_KIND_LABELS,
  LIBRARY_LIMITS,
  LIBRARY_TOO_LARGE_MESSAGE,
  LIBRARY_VISIBILITIES,
  LIBRARY_VISIBILITY_LABELS,
  libraryPublishResponseSchema,
  toLibraryItemPage,
  type LibraryJob,
  type LibraryKind,
  type LibraryVisibility,
} from "../contract";
import { derivePitch, guessLibraryKind, splitShareBox } from "../rules-share";

export type PublishDraft = {
  itemId?: string;
  title: string;
  // Empty: the first line of the paste (derivePitch).
  pitch: string;
  // Empty: the guess the form shows (guessLibraryKind).
  kind: LibraryKind | "";
  job: LibraryJob | "";
  // The one box: a paste, or a single link.
  box: string;
  // A link next to pasted text (under More options).
  link: string;
  install: string;
  visibility: LibraryVisibility;
  companies: string;
};

export const EMPTY_DRAFT: PublishDraft = {
  title: "",
  pitch: "",
  kind: "",
  job: "",
  box: "",
  link: "",
  install: "",
  visibility: LIBRARY_VISIBILITIES.portfolio,
  companies: "",
};

const FALLBACK_ERROR = "That didn’t go through. Try again.";
const ICON = { "aria-hidden": true, className: "fh-i fh-xs", strokeWidth: 1.5 } as const;

async function sendPublish(draft: PublishDraft & { kind: LibraryKind }, files: File[]) {
  const form = new FormData();
  const { companies, box, link, ...fields } = draft;
  const parts = splitShareBox(box);
  form.set(
    "item",
    JSON.stringify({
      ...fields,
      description: parts.text,
      link: parts.link || link,
      companies: companies
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    }),
  );
  for (const file of files) form.append("files", file, file.name);
  const response = await fetch(LIBRARY_API_ROUTES.publish, { method: "POST", body: form, credentials: "same-origin" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : FALLBACK_ERROR;
    throw new Error(message);
  }
  return libraryPublishResponseSchema.parse(body);
}

function describeSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The scan's one promise, shown once, on the form that spends it.
export const LIBRARY_FILES_HINT = "What you paste or attach is checked for keys and passwords. Files: 10 MB at most.";

// Share in one form (round 7): a title, one box for a paste or a link, files beside it, and the guessed kind with a
// one-tap fix. The pitch, the role, install steps, a second link and who can see it wait under "More options". A new
// version of your own item uses the same form, filled in.
export function PublishForm({ initial, ownCompany }: { initial: PublishDraft; ownCompany: string | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [isChangingKind, setIsChangingKind] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  // The refusal sits at the top of the form: bring it into view, where the button was clicked below.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center" });
  }, [error]);
  const isNewVersion = Boolean(initial.itemId);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const set = <Key extends keyof PublishDraft>(key: Key, value: PublishDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));
  const parts = splitShareBox(draft.box);
  const fileNames = files.map((file) => file.name);
  const kind = draft.kind || guessLibraryKind({ title: draft.title, text: parts.text, link: parts.link, fileNames });
  const pitchGuess = derivePitch({ title: draft.title, text: parts.text, link: parts.link || draft.link, fileNames });
  const isMoreOpen = Boolean(initial.job || initial.install || initial.link || initial.visibility !== LIBRARY_VISIBILITIES.portfolio);

  return (
    <form
      className="fh-sheet fh-lib-form"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (totalBytes > LIBRARY_LIMITS.maximumBytes) {
          setError(LIBRARY_TOO_LARGE_MESSAGE);
          return;
        }
        setIsBusy(true);
        sendPublish({ ...draft, kind }, files)
          .then(({ id }) => {
            router.push(`${toLibraryItemPage(id)}?m=${isNewVersion ? "saved" : "shared"}`);
            router.refresh();
          })
          .catch((failure: unknown) => {
            setError(failure instanceof Error ? failure.message : FALLBACK_ERROR);
            setIsBusy(false);
          });
      }}
    >
      {error ? (
        <div ref={errorRef}>
          <Note kind="needs" role="alert" className="mb-4">
            {error}
          </Note>
        </div>
      ) : null}
      <Field htmlFor="library-title" label="Title">
        <Input id="library-title" value={draft.title} onChange={(event) => set("title", event.target.value)} maxLength={LIBRARY_LIMITS.titleLength} required placeholder="Outbound email reviewer" />
      </Field>
      <Field
        htmlFor="library-box"
        label="Paste it, link it or attach a file"
        hint={`${LIBRARY_FILES_HINT}${isNewVersion ? " No new files keeps the current ones." : ""}`}
        className="mt-4"
      >
        <Textarea
          id="library-box"
          rows={6}
          value={draft.box}
          onChange={(event) => set("box", event.target.value)}
          maxLength={LIBRARY_LIMITS.descriptionLength}
          placeholder="Paste your prompt or setup, or a link to it"
        />
      </Field>
      <label className="fh-btn fh-btn-secondary fh-btn-sm fh-lib-attach mt-3" htmlFor="library-files">
        <Paperclip {...ICON} />
        {files.length > 0 ? "Change the files" : isNewVersion ? "Attach files for a new version" : "Attach a file"}
      </label>
      <input id="library-files" className="fh-sr" type="file" multiple accept={LIBRARY_FILE_ACCEPT} onChange={(event) => setFiles([...(event.target.files ?? [])])} />
      {files.length > 0 ? (
        <ul className="fh-small fh-muted mt-2">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              {file.name} · {describeSize(file.size)}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-4" data-slot="library-kind">
        {isChangingKind ? (
          <Field htmlFor="library-kind" label="Kind">
            <Select id="library-kind" value={kind} onChange={(event) => set("kind", event.target.value as LibraryKind)}>
              {(Object.entries(LIBRARY_KIND_LABELS) as [LibraryKind, string][]).map(([option, label]) => (
                <option key={option} value={option}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <p className="fh-small">
            <span className="fh-muted">Kind:</span> <b>{LIBRARY_KIND_LABELS[kind]}</b>{" "}
            <button type="button" className="fh-linkbtn" onClick={() => setIsChangingKind(true)} aria-label={`Change the kind (now ${LIBRARY_KIND_LABELS[kind]})`}>
              Change
            </button>
          </p>
        )}
      </div>
      <details className="fh-others mt-4" open={isMoreOpen}>
        <summary className="fh-small">More options</summary>
        <Field htmlFor="library-pitch" label="One-line pitch" hint="Empty uses the first line of what you pasted." className="mt-3">
          <Input
            id="library-pitch"
            value={draft.pitch}
            onChange={(event) => set("pitch", event.target.value)}
            maxLength={LIBRARY_LIMITS.pitchLength}
            placeholder={pitchGuess || "Scores a cold email and rewrites the opening line"}
          />
        </Field>
        <Field htmlFor="library-job" label="Role it helps" className="mt-4">
          <Select id="library-job" value={draft.job} onChange={(event) => set("job", event.target.value as LibraryJob | "")}>
            <option value="">Any role</option>
            {(Object.entries(LIBRARY_JOB_LABELS) as [LibraryJob, string][]).map(([job, label]) => (
              <option key={job} value={job}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {parts.link ? null : (
          <Field htmlFor="library-link" label="A link too" className="mt-4">
            <Input id="library-link" type="url" value={draft.link} onChange={(event) => set("link", event.target.value)} maxLength={LIBRARY_LIMITS.linkLength} placeholder="https://github.com/…" />
          </Field>
        )}
        <Field htmlFor="library-install" label="How to install" className="mt-4">
          <Textarea id="library-install" rows={4} value={draft.install} onChange={(event) => set("install", event.target.value)} maxLength={LIBRARY_LIMITS.installLength} />
        </Field>
        <fieldset className="mt-4">
          <legend className="fh-label">Who can see it</legend>
          {(Object.entries(LIBRARY_VISIBILITY_LABELS) as [LibraryVisibility, string][]).map(([visibility, label]) => (
            <label key={visibility} className="fh-lib-radio">
              <input type="radio" name="visibility" value={visibility} checked={draft.visibility === visibility} onChange={() => set("visibility", visibility)} />
              {label}
            </label>
          ))}
        </fieldset>
        {draft.visibility === LIBRARY_VISIBILITIES.companies ? (
          <Field htmlFor="library-companies" label="Companies" hint="Names as on members’ cards, with commas between." className="mt-3">
            <Input id="library-companies" value={draft.companies} onChange={(event) => set("companies", event.target.value)} placeholder={ownCompany ?? "Ledgerline, Gridwise"} />
          </Field>
        ) : null}
      </details>
      <div className="fh-btn-row mt-5">
        <Button type="submit" variant="ink" disabled={isBusy}>
          {isBusy ? "Checking and saving…" : isNewVersion ? "Save" : "Share in the library"}
        </Button>
        {draft.visibility === LIBRARY_VISIBILITIES.portfolio ? <span className="fh-small fh-muted">The whole portfolio sees it.</span> : null}
      </div>
    </form>
  );
}
