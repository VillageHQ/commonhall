import "server-only";

import { eq } from "drizzle-orm";

import { asksManifest } from "@/modules/asks/manifest";
import { introsManifest } from "@/modules/intros/manifest";
import { memberNetwork } from "@/modules/members/schema";
import { messagesManifest } from "@/modules/messages/manifest";
import { networkManifest } from "@/modules/network/manifest";
import type { Database } from "@/platform/database/client";
import { EMAIL_TOPICS } from "@/platform/email/kinds";
import { readResendConfig } from "@/platform/email/resend";
import { readOptedOutTopics } from "@/platform/email/unsubscribe";
import { WEEKDAYS } from "@/platform/weekly-email/schedule";
import { readWeeklySchedule } from "@/platform/weekly-email/schedule-store";
import { readEnabledIds } from "@/shell/enabled-modules";

import type { EmailSettingRow } from "./email-preferences-card";

// The rows of Commonhall's Email settings: the weekly digest, asks and messages. Community's own: intro emails and
// intro reminders, each with its own switch like the others (PRIV-09), and the reminder to connect a network only for
// a member who hasn't connected one.
export async function readEmailSettingRows(database: Database, memberId: string): Promise<EmailSettingRow[] | null> {
  if (!readResendConfig(process.env)) return null;
  const [enabledIds, optedOut, schedule, [network]] = await Promise.all([
    readEnabledIds(database),
    readOptedOutTopics(database, memberId),
    readWeeklySchedule(database),
    database.select({ villageLinkedAt: memberNetwork.villageLinkedAt }).from(memberNetwork).where(eq(memberNetwork.userId, memberId)),
  ]);
  const isOn = (topic: string) => !optedOut.has(topic);
  const hour = String(schedule.hour).padStart(2, "0");
  const rows: EmailSettingRow[] = [
    {
      topic: EMAIL_TOPICS.weekly,
      title: "The weekly digest",
      description: `${WEEKDAYS[schedule.weekday]}s at ${hour}:00 ${schedule.timeZone}, only when something needs you.`,
      isOn: isOn(EMAIL_TOPICS.weekly),
    },
    {
      topic: EMAIL_TOPICS.announcements,
      title: "Announcements from the team",
      description: null,
      isOn: isOn(EMAIL_TOPICS.announcements),
    },
  ];
  if (enabledIds.has(asksManifest.id)) {
    rows.push({
      topic: EMAIL_TOPICS.asks,
      title: "When an ask needs someone I know",
      description: null,
      isOn: isOn(EMAIL_TOPICS.asks),
    });
  }
  if (enabledIds.has(messagesManifest.id)) {
    rows.push({
      topic: EMAIL_TOPICS.messages,
      title: "When someone messages me",
      description: "At most one every 15 minutes.",
      isOn: isOn(EMAIL_TOPICS.messages),
    });
  }
  if (enabledIds.has(introsManifest.id)) {
    rows.push(
      {
        topic: EMAIL_TOPICS.intros,
        title: "Intro asks and introductions",
        description: null,
        isOn: isOn(EMAIL_TOPICS.intros),
      },
      {
        topic: EMAIL_TOPICS.introReminders,
        title: "Intro reminders",
        description: "One reminder, then “was it helpful?”",
        isOn: isOn(EMAIL_TOPICS.introReminders),
      },
    );
  }
  if (enabledIds.has(networkManifest.id) && !network?.villageLinkedAt) {
    rows.push({
      topic: EMAIL_TOPICS.network,
      title: "Remind me to connect my network",
      description: "At most once a month.",
      isOn: isOn(EMAIL_TOPICS.network),
    });
  }
  return rows;
}
