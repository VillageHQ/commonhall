"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";

import { FEED_TOOLS, JOB_BOARD_API_ROUTES, JOB_BOARD_LIMITS } from "../contract";
import { useJobAction } from "./use-job-action";

// "Already on Greenhouse, Lever…? Paste your careers link" (round 7): the second way onto the board. The link names its
// tool, so there is no tool to pick; the app finds the board in it and pulls the open jobs every hour. A founder links
// only the company on their card; an admin may type another.
export function LinkSourceForm({ defaultCompany, isCompanyFixed }: { defaultCompany: string; isCompanyFixed: boolean }) {
  const [company, setCompany] = useState(defaultCompany);
  const [link, setLink] = useState("");
  const linkTool = useJobAction<{ company: string; link: string }>(JOB_BOARD_API_ROUTES.link, { onDone: () => setLink("") });
  const done = linkTool.data ?? null;
  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        linkTool.mutate({ company, link });
      }}
    >
      {linkTool.error ? (
        <Note kind="needs" role="alert" className="mb-3">
          {linkTool.error.message}
        </Note>
      ) : null}
      {isCompanyFixed ? null : (
        <div className="fh-field">
          <label className="fh-label fh-small" htmlFor="oj-company">
            Company
          </label>
          <Input id="oj-company" value={company} maxLength={JOB_BOARD_LIMITS.companyLength} onChange={(event) => setCompany(event.target.value)} autoComplete="organization" required />
        </div>
      )}
      <div className="fh-field">
        <label className="fh-label fh-small" htmlFor="oj-link">
          Careers link
        </label>
        <Input
          id="oj-link"
          value={link}
          maxLength={JOB_BOARD_LIMITS.linkLength}
          onChange={(event) => setLink(event.target.value)}
          placeholder={`e.g. ${FEED_TOOLS.greenhouse.example}`}
          inputMode="url"
          required
          aria-invalid={linkTool.error ? true : undefined}
          aria-describedby="oj-link-help"
        />
        <p id="oj-link-help" className="fh-hint">
          We find the board in the link and pull your open jobs every hour. No key needed.
        </p>
      </div>
      {done ? (
        <Note kind={done.ok === false ? "needs" : "ok"} role="status" className="mt-3">
          {done.message}
        </Note>
      ) : null}
      <div className="fh-btn-row" style={{ marginTop: 12 }}>
        <Button type="submit" size="sm" variant="secondary" disabled={linkTool.isPending}>
          <RefreshCw aria-hidden="true" className={linkTool.isPending ? "animate-spin" : undefined} />
          {linkTool.isPending ? "Linking…" : "Link and pull our jobs"}
        </Button>
      </div>
    </form>
  );
}
