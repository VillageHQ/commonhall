"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { acknowledgedResponseSchema } from "@/platform/http/contract";
import { postRequest } from "@/platform/http/post-request";
import { readFirstName } from "@/platform/design/avatar-identity";
import {
  COMMUNITY_ROLE_LABELS,
  COMMUNITY_ROLE_VALUES,
  type CommunityRole,
  type SetCommunityRoleBody,
} from "@/modules/members/contract-community-roles";

import type { AdminMember } from "@/modules/admin/contract";

type CommunityRoleActionProps = { member: AdminMember; onDone: (message: string) => void };

export const COMMUNITY_ROLE_API_ROUTE = "/api/admin/members/community-role";

function setCommunityRoleRequest(body: SetCommunityRoleBody) {
  return postRequest(COMMUNITY_ROLE_API_ROUTE, body, acknowledgedResponseSchema);
}

const SELECT_ID = "community-role";

// Founder (the default), Mentor, Expert, Advisor, Entrepreneur in residence or Fund team. Mentors, experts, advisors and
// entrepreneurs in residence show in the directory's "Experts and mentors". Every change goes in the audit log.
export function CommunityRoleAction({ member, onDone }: CommunityRoleActionProps) {
  const [chosen, setChosen] = useState<CommunityRole>(member.communityRole);
  const save = useMutation({ mutationFn: setCommunityRoleRequest, onSuccess: ({ message }) => onDone(message) });
  const firstName = readFirstName(member.name);
  return (
    <section className="fh-sheet">
      <h2 className="fh-h3">
        <label htmlFor={SELECT_ID}>Community role</label>
      </h2>
      <p className="fh-small fh-muted mt-1">
        {firstName} is listed as {COMMUNITY_ROLE_LABELS[member.communityRole]}. Mentors, experts, advisors and entrepreneurs in residence show under “Experts and mentors” in the
        directory.
      </p>
      <div className="fh-btn-row mt-3">
        <Select id={SELECT_ID} className="max-w-64" value={chosen} onChange={(event) => setChosen(event.target.value as CommunityRole)}>
          {COMMUNITY_ROLE_VALUES.map((role) => (
            <option key={role} value={role}>
              {COMMUNITY_ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={save.isPending || chosen === member.communityRole}
          onClick={() => save.mutate({ memberId: member.id, communityRole: chosen })}
        >
          Save role
        </Button>
      </div>
      <FormError message={save.error?.message ?? null} />
    </section>
  );
}
