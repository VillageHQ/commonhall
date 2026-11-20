"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const COPIED_RESET_MS = 2_000;

async function copyText(text: string, setWasCopied: (wasCopied: boolean) => void) {
  await navigator.clipboard.writeText(text);
  setWasCopied(true);
  setTimeout(() => setWasCopied(false), COPIED_RESET_MS);
}

type CopyButtonProps = { text: string; label: string; variant?: "primary" | "outline" | "quiet"; size?: "default" | "sm" };

export function CopyButton({ text, label, variant = "outline", size = "sm" }: CopyButtonProps) {
  const [wasCopied, setWasCopied] = useState(false);

  return (
    <Button type="button" variant={variant} size={size} onClick={() => copyText(text, setWasCopied)}>
      {wasCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{wasCopied ? "Copied" : label}</span>
    </Button>
  );
}
