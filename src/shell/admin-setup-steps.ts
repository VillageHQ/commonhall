// The one setup checklist (round 7): the community's name (/setup asks it), the first invites and the admin's card
// (the guided start's two steps), and how invites go out (mail, or links the admin copies). Village is optional, on
// Set up; the partner report is a tile on Home. These steps are the console's launch checklist and the Set up badge.
export const SETUP_STEPS = { name: "name", invite: "invite", card: "card", mail: "mail" } as const;

export type SetupStepId = (typeof SETUP_STEPS)[keyof typeof SETUP_STEPS];

export const SETUP_STEP_ORDER: readonly SetupStepId[] = [SETUP_STEPS.name, SETUP_STEPS.invite, SETUP_STEPS.card, SETUP_STEPS.mail];

// "Next: invite your first founders." (Home's item and the admin's Today card).
export const SETUP_STEP_NAMES: Record<SetupStepId, string> = {
  [SETUP_STEPS.name]: "name your community",
  [SETUP_STEPS.invite]: "invite your first founders",
  [SETUP_STEPS.card]: "fill in your card",
  [SETUP_STEPS.mail]: "choose how invites go out",
};
