import type { Metadata } from "next";

import { AlertSettingsForm } from "@/components/alerts/alert-settings-form";
import { DeviceAlertsCard } from "@/components/alerts/device-alerts-card";
import { MutedPeople } from "@/components/alerts/muted-people";
import { BackLink } from "@/components/page-header";
import { introsManifest } from "@/modules/intros/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { readListedMemberNames } from "@/modules/members/reads-directory";
import { messagesManifest } from "@/modules/messages/manifest";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { NOTIFICATION_KINDS, type NotificationKind } from "@/platform/notifications/contract";
import { readMutedPeople, readPreferences, readPreferenceSaved } from "@/platform/notifications/reads";
import { readVapidKeys } from "@/platform/notifications/vapid";
import { readEnabledIds } from "@/shell/enabled-modules";

export const metadata: Metadata = { title: PAGE_TITLES.alerts };

// Which kinds a member can switch, by the feature that sends them. A kind whose feature is off (or not built yet:
// voice rooms, the AI library) gets no row; its part adds its line here.
const KIND_FEATURES: readonly { kind: NotificationKind; featureId: string }[] = [
  { kind: NOTIFICATION_KINDS.intro, featureId: introsManifest.id },
  { kind: NOTIFICATION_KINDS.answer, featureId: introsManifest.id },
  { kind: NOTIFICATION_KINDS.message, featureId: messagesManifest.id },
];

// Settings › Alerts: this device, what alerts the member, quiet hours, muted broadcasters.
export default modulePage(membersManifest, async function AlertsPage() {
  const member = await requireMember();
  const database = getDatabase();
  const [community, enabledIds, preferences, isSaved, muted, members, keys] = await Promise.all([
    readBrandingForPage(),
    readEnabledIds(database),
    readPreferences(database, member.id),
    readPreferenceSaved(database, member.id),
    readMutedPeople(database, member.id),
    readListedMemberNames(database, member.id),
    readVapidKeys(database),
  ]);
  const kinds = KIND_FEATURES.filter(({ featureId }) => enabledIds.has(featureId)).map(({ kind }) => kind);
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Alerts</h1>
        <p className="fh-lede">What {community.name} alerts you to on your phone and computer, and when it stays quiet.</p>
      </header>
      <div className="grid max-w-[720px] gap-4">
        <DeviceAlertsCard vapidPublicKey={keys.publicKey} isPaused={!preferences.isOn} />
        <AlertSettingsForm preferences={preferences} kinds={kinds} isSaved={isSaved} />
        <MutedPeople muted={muted} members={members} />
      </div>
    </>
  );
});
