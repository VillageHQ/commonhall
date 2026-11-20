import type { Metadata } from "next";

import { AlertSettingsForm } from "@/components/alerts/alert-settings-form";
import { DeviceAlertsCard } from "@/components/alerts/device-alerts-card";
import { MutedPeople } from "@/components/alerts/muted-people";
import { PauseCard } from "@/components/alerts/pause-card";
import { BackLink } from "@/components/page-header";
import { introsManifest } from "@/modules/intros/manifest";
import { libraryManifest } from "@/modules/library/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { readListedMemberNames } from "@/modules/members/reads-directory";
import { messagesManifest } from "@/modules/messages/manifest";
import { VOICE_PAGE } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { requireMember } from "@/platform/auth/session";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { NOTIFICATION_KINDS, type NotificationKind } from "@/platform/notifications/contract";
import { readMutedPeople, readPreferences, readPreferenceSaved } from "@/platform/notifications/reads";
import { readVapidKeys } from "@/platform/notifications/vapid";
import { readEnabledIds } from "@/shell/enabled-modules";

export const metadata: Metadata = { title: PAGE_TITLES.alerts };

// Which kinds a member can switch, by the feature that sends them: a kind whose feature is off gets no row.
const KIND_FEATURES: readonly { kind: NotificationKind; featureId: string }[] = [
  { kind: NOTIFICATION_KINDS.intro, featureId: introsManifest.id },
  { kind: NOTIFICATION_KINDS.message, featureId: messagesManifest.id },
  { kind: NOTIFICATION_KINDS.answer, featureId: introsManifest.id },
  { kind: NOTIFICATION_KINDS.voiceRoom, featureId: voiceManifest.id },
  { kind: NOTIFICATION_KINDS.voiceBroadcast, featureId: voiceManifest.id },
  { kind: NOTIFICATION_KINDS.library, featureId: libraryManifest.id },
];

type AlertsPageProps = { searchParams: Promise<{ from?: string }> };

// Alerts: this device, Pause, Quiet times (with Let through), what alerts you, and muted people (folded). Reached from
// the avatar menu, the bell on Rooms (`?from=rooms` goes back there) and My profile.
export default modulePage(membersManifest, async function AlertsPage({ searchParams }: AlertsPageProps) {
  const member = await requireMember();
  const database = getDatabase();
  const [{ from }, enabledIds, preferences, isSaved, muted, members, keys] = await Promise.all([
    searchParams,
    readEnabledIds(database),
    readPreferences(database, member.id),
    readPreferenceSaved(database, member.id),
    readMutedPeople(database, member.id),
    readListedMemberNames(database, member.id),
    readVapidKeys(database),
  ]);
  const kinds = KIND_FEATURES.filter(({ featureId }) => enabledIds.has(featureId)).map(({ kind }) => kind);
  const { pausedUntil, ...choices } = preferences;
  const isFromRooms = from === "rooms" && enabledIds.has(voiceManifest.id);
  return (
    <>
      {isFromRooms ? <BackLink href={VOICE_PAGE}>Rooms</BackLink> : <BackLink href={ROUTES.editCard}>My profile</BackLink>}
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Alerts</h1>
      </header>
      <div className="grid max-w-[720px] gap-4">
        <DeviceAlertsCard vapidPublicKey={keys.publicKey} isPaused={!preferences.isOn} />
        <PauseCard pausedUntil={pausedUntil?.toISOString() ?? null} timeZone={preferences.timeZone} isSaved={isSaved} />
        <AlertSettingsForm preferences={choices} kinds={kinds} isSaved={isSaved} />
        <MutedPeople muted={muted} members={members} />
      </div>
    </>
  );
});
