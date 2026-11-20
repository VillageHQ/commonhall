"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Note } from "@/components/ui/note";

import { JOB_BOARD_API_ROUTES, JOB_BOARD_LIMITS } from "../contract";
import { useJobAction } from "./use-job-action";

type AddJobBody = { company?: string; title: string; location: string; url: string };

// "Add a job" (round 7): the first way onto the board, for a founder with no hiring tool. The job goes on the company's
// one card. The link is optional: an email works, and with neither, Apply on the members' board messages the founder.
// A founder's company is the one on their card; an admin may type another.
export function AddJobForm({ defaultCompany, isCompanyFixed }: { defaultCompany: string; isCompanyFixed: boolean }) {
  const [company, setCompany] = useState(defaultCompany);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const add = useJobAction<AddJobBody>(JOB_BOARD_API_ROUTES.addJob, {
    onDone: () => {
      setTitle("");
      setLocation("");
      setUrl("");
    },
  });
  return (
    <form
      className="mt-3 grid gap-3"
      aria-labelledby="add-job-title"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate({ ...(isCompanyFixed ? {} : { company }), title, location, url });
      }}
    >
      <h3 id="add-job-title" className="fh-h3">
        Add a job
      </h3>
      {isCompanyFixed ? null : (
        <div className="grid gap-2">
          <Label htmlFor="job-company">Company</Label>
          <Input id="job-company" value={company} maxLength={JOB_BOARD_LIMITS.companyLength} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" required />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="job-title">Title</Label>
          <Input id="job-title" value={title} maxLength={JOB_BOARD_LIMITS.titleLength} onChange={(event) => setTitle(event.target.value)} placeholder="Founding engineer" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="job-location">Location</Label>
          <Input id="job-location" value={location} maxLength={JOB_BOARD_LIMITS.locationLength} onChange={(event) => setLocation(event.target.value)} placeholder="Boston or remote" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="job-url">Apply link or email (optional)</Label>
        <Input id="job-url" value={url} maxLength={JOB_BOARD_LIMITS.linkLength} onChange={(event) => setUrl(event.target.value)} placeholder="https://… or jobs@yourcompany.com" aria-describedby="job-url-help" />
        <p id="job-url-help" className="fh-hint">
          Leave it empty and members apply by messaging you.
        </p>
      </div>
      <FormError message={add.error?.message ?? null} />
      {add.data ? (
        <Note kind="ok" role="status">
          {add.data.message}
        </Note>
      ) : null}
      <div>
        <Button type="submit" size="sm" disabled={add.isPending} className="max-sm:w-full">
          <Plus aria-hidden="true" />
          Add the job
        </Button>
      </div>
    </form>
  );
}

export function RemoveJobButton({ sourceId, jobId, title }: { sourceId: string; jobId: string; title: string }) {
  const remove = useJobAction<{ sourceId: string; jobId: string }>(JOB_BOARD_API_ROUTES.removeJob);
  return (
    <Button variant="quiet" size="icon" disabled={remove.isPending} onClick={() => remove.mutate({ sourceId, jobId })} title={remove.error?.message}>
      <Trash2 aria-hidden="true" />
      <span className="sr-only">Remove {title}</span>
    </Button>
  );
}
