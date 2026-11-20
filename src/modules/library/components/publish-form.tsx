"use client";

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

export type PublishDraft = {
  itemId?: string;
  title: string;
  pitch: string;
  kind: LibraryKind | "";
  job: LibraryJob | "";
  description: string;
  install: string;
  link: string;
  visibility: LibraryVisibility;
  companies: string;
};

export const EMPTY_DRAFT: PublishDraft = {
  title: "",
  pitch: "",
  kind: "",
  job: "",
  description: "",
  install: "",
  link: "",
  visibility: LIBRARY_VISIBILITIES.portfolio,
  companies: "",
};

const FALLBACK_ERROR = "That didn’t go through. Try again.";

async function sendPublish(draft: PublishDraft, files: File[]) {
  const form = new FormData();
  const { companies, ...fields } = draft;
  form.set(
    "item",
    JSON.stringify({
      ...fields,
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

// The upload's one promise, shown once, on the form that spends it.
export const LIBRARY_FILES_HINT = "Checked for keys and passwords. 10 MB at most.";

// Publish in one form: what it is, the files, who can see it; a link and install steps under "More details". A new
// version of your own item uses the same form, filled in.
export function PublishForm({ initial, ownCompany }: { initial: PublishDraft; ownCompany: string | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  // The refusal sits at the top of a long form: bring it into view, where the button was clicked far below.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: "center" });
  }, [error]);
  const isNewVersion = Boolean(initial.itemId);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const set = <Key extends keyof PublishDraft>(key: Key, value: PublishDraft[Key]) => setDraft((current) => ({ ...current, [key]: value }));

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
        sendPublish(draft, files)
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
      <Field htmlFor="library-pitch" label="One-line pitch" className="mt-4">
        <Input id="library-pitch" value={draft.pitch} onChange={(event) => set("pitch", event.target.value)} maxLength={LIBRARY_LIMITS.pitchLength} required placeholder="Scores a cold email and rewrites the opening line" />
      </Field>
      <div className="fh-lib-two mt-4">
        <Field htmlFor="library-kind" label="Kind">
          <Select id="library-kind" value={draft.kind} onChange={(event) => set("kind", event.target.value as LibraryKind)} required>
            <option value="">Pick one</option>
            {(Object.entries(LIBRARY_KIND_LABELS) as [LibraryKind, string][]).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field htmlFor="library-job" label="Role">
          <Select id="library-job" value={draft.job} onChange={(event) => set("job", event.target.value as LibraryJob)} required>
            <option value="">Pick one</option>
            {(Object.entries(LIBRARY_JOB_LABELS) as [LibraryJob, string][]).map(([job, label]) => (
              <option key={job} value={job}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field htmlFor="library-description" label="Description" className="mt-4">
        <Textarea id="library-description" rows={5} value={draft.description} onChange={(event) => set("description", event.target.value)} maxLength={LIBRARY_LIMITS.descriptionLength} />
      </Field>
      <Field
        htmlFor="library-files"
        label={isNewVersion ? "Files for the new version" : "Files"}
        hint={`${LIBRARY_FILES_HINT}${isNewVersion ? " Empty keeps the current files." : ""}`}
        className="mt-4"
      >
        <Input id="library-files" type="file" multiple accept={LIBRARY_FILE_ACCEPT} onChange={(event) => setFiles([...(event.target.files ?? [])])} />
      </Field>
      {files.length > 0 ? (
        <ul className="fh-small fh-muted mt-2">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`}>
              {file.name} · {describeSize(file.size)}
            </li>
          ))}
        </ul>
      ) : null}
      <details className="fh-others mt-4" open={Boolean(initial.link || initial.install)}>
        <summary className="fh-small">More details</summary>
        <Field htmlFor="library-link" label="Or a link" className="mt-3">
          <Input id="library-link" type="url" value={draft.link} onChange={(event) => set("link", event.target.value)} maxLength={LIBRARY_LIMITS.linkLength} placeholder="https://github.com/…" />
        </Field>
        <Field htmlFor="library-install" label="How to install" className="mt-4">
          <Textarea id="library-install" rows={4} value={draft.install} onChange={(event) => set("install", event.target.value)} maxLength={LIBRARY_LIMITS.installLength} />
        </Field>
      </details>
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
      <div className="fh-btn-row mt-5">
        <Button type="submit" variant="ink" disabled={isBusy}>
          {isBusy ? "Checking and saving…" : isNewVersion ? "Save" : "Share in the library"}
        </Button>
      </div>
    </form>
  );
}
