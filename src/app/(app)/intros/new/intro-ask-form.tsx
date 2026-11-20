"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConsentLine, Note } from "@/components/ui/note";
import { readFirstName } from "@/platform/design/avatar-identity";
import { ROUTES } from "@/platform/http/routes";
import { SHORT_PRIVACY_LINE } from "@/modules/intros/components/intro-words";
import { createIntroRequest, INTRO_QUERY_KEYS } from "@/modules/intros/queries";
import { ASKED_FLASH_PARAM, ASKED_FLASH_VALUE } from "@/shell/intro-ask-forms";
import { NOTE_MAXIMUM, describeTargetAbout, draftIntroNote, type AskerProfile } from "@/shell/intro-ask-note";

type IntroAskFormProps = {
  connector: { id: string; name: string };
  // The note is drafted from the asker's card and the person they name, until they edit it themselves.
  asker: AskerProfile;
  // Why the ask can't go now (the week's asks are used, the member paused asks), or null.
  blockedReason: string | null;
};

function PersonField({ id, label, placeholder, value, onChange, isRequired = false }: { id: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; isRequired?: boolean }) {
  return (
    <div>
      <label className="fh-label fh-small" htmlFor={id}>
        {label}
      </label>
      <input className="fh-input" id={id} maxLength={120} required={isRequired} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

// The ask from a member's profile (round 6): who, and one short note. How an intro works sits under its own fold.
export function IntroAskForm({ connector, asker, blockedReason }: IntroAskFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [person, setPerson] = useState({ name: "", role: "", company: "" });
  // Null while the asker hasn't touched the note: it follows the person's boxes as they're filled in.
  const [editedNote, setEditedNote] = useState<string | null>(null);
  const note = editedNote ?? draftIntroNote(asker, { name: person.name, about: describeTargetAbout(person.role, person.company) });
  const connectorFirst = readFirstName(connector.name);
  const ask = useMutation({
    mutationFn: createIntroRequest,
    onSuccess: async (intro) => {
      await queryClient.invalidateQueries({ queryKey: [INTRO_QUERY_KEYS.board] });
      router.push(`${ROUTES.intros}/${intro.id}?${ASKED_FLASH_PARAM}=${ASKED_FLASH_VALUE}`);
    },
  });
  const error = ask.error?.message ?? blockedReason;
  return (
    <>
      {error ? (
        <Note kind="needs" role="alert" className="mt-3.5">
          {error}
        </Note>
      ) : null}
      <form
        className="fh-section"
        id="askform"
        onSubmit={(event) => {
          event.preventDefault();
          ask.mutate({ connectorId: connector.id, target: { name: person.name, role: person.role, company: person.company, email: null, linkedin: null }, note });
        }}
      >
        <p className="fh-label">Who should {connectorFirst} introduce you to?</p>
        <div className="fh-pair">
          <PersonField id="t-name" label="Name" placeholder="e.g. Alex Rivera" isRequired value={person.name} onChange={(name) => setPerson((current) => ({ ...current, name }))} />
          <PersonField id="t-role" label="Role" placeholder="e.g. VP Procurement" value={person.role} onChange={(role) => setPerson((current) => ({ ...current, role }))} />
          <PersonField id="t-company" label="Company" placeholder="e.g. Halcyon Health" value={person.company} onChange={(company) => setPerson((current) => ({ ...current, company }))} />
        </div>
        <label className="fh-label" htmlFor="a-note" style={{ marginTop: 18 }}>
          Your note to {connectorFirst}
        </label>
        <textarea className="fh-textarea" id="a-note" name="note" rows={7} maxLength={NOTE_MAXIMUM} required value={note} onChange={(event) => setEditedNote(event.target.value)} />
        <div style={{ marginTop: 12 }}>
          <ConsentLine />
          {/* The owner decided (2026-11-11): admins see who asked whom, and members are told where they ask. */}
          <p className="fh-small fh-muted mt-1.5">{SHORT_PRIVACY_LINE}</p>
        </div>
        <div className="fh-send-row">
          <Button type="submit" width="block" disabled={blockedReason !== null || ask.isPending || ask.isSuccess}>
            <Send aria-hidden="true" />
            Ask {connectorFirst}
          </Button>
        </div>
      </form>
    </>
  );
}
