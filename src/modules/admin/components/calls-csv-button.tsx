"use client";

import { useMutation } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { readResponseFailure } from "@/platform/http/read-response-message";

import { CALLS_CSV_API_ROUTE, CALLS_CSV_FILE_NAME } from "../calls";

const DOWNLOAD_FAILED = "We couldn't make the CSV. Try again.";

async function downloadCallsCsv() {
  const response = await fetch(CALLS_CSV_API_ROUTE, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => null);
  if (!response) throw new Error(DOWNLOAD_FAILED);
  if (!response.ok) throw new Error((await readResponseFailure(response, DOWNLOAD_FAILED)).message);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = CALLS_CSV_FILE_NAME;
  link.click();
  URL.revokeObjectURL(url);
}

export function CallsCsvButton() {
  const download = useMutation({ mutationFn: downloadCallsCsv });
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
