import { ROUTES } from "@/platform/http/routes";
import { ME_PAGES } from "@/modules/members/contract-me-pages";

// A member's settings, one list (round 7, less-choice Part 3): the avatar menu and the foot of My profile show the same
// items in this order. Your network and Our jobs show while their feature is on.
export const SETTINGS_KEYS = {
  card: "card",
  privacy: "privacy",
  alerts: "alerts",
  email: "email",
  booking: "booking",
  network: "network",
  jobs: "jobs",
  data: "data",
  password: "password",
} as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS];

export type SettingsLink = { key: SettingsKey; label: string; href: string };

// On My profile the card is the page itself, so its row opens the card's editor there.
export const EDIT_CARD_HREF = `${ROUTES.editCard}?edit=card#card`;

const SETTINGS: readonly (SettingsLink & { moduleId?: string })[] = [
  { key: SETTINGS_KEYS.card, label: "My card", href: ROUTES.editCard },
  { key: SETTINGS_KEYS.privacy, label: "Privacy", href: ME_PAGES.privacy },
  { key: SETTINGS_KEYS.alerts, label: "Alerts", href: ROUTES.alerts },
  { key: SETTINGS_KEYS.email, label: "Email", href: ROUTES.emailSettings },
  { key: SETTINGS_KEYS.booking, label: "Booking link", href: ME_PAGES.booking },
  { key: SETTINGS_KEYS.network, label: "Your network", href: ROUTES.myNetwork, moduleId: "network" },
  // "Our jobs", not "Jobs": the menu's More already holds the job board as "Jobs".
  { key: SETTINGS_KEYS.jobs, label: "Our jobs", href: ME_PAGES.jobs, moduleId: "job-board" },
  { key: SETTINGS_KEYS.data, label: "Your data", href: ROUTES.yourData },
  { key: SETTINGS_KEYS.password, label: "How you sign in", href: ME_PAGES.password },
];

export function readSettingsLinks(enabledIds: ReadonlySet<string>): SettingsLink[] {
  return SETTINGS.filter(({ moduleId }) => !moduleId || enabledIds.has(moduleId)).map(({ key, label, href }) => ({ key, label, href }));
}
