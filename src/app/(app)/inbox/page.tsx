import type { Metadata } from "next";

import { membersManifest } from "@/modules/members/manifest";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: "Inbox" };

// The Inbox's list lives in its layout. This page is the web's right pane while no conversation is open; a phone
// shows the list alone.
export default modulePage(membersManifest, async function InboxPage() {
  return (
    <p data-slot="inbox-pick" className="ib-pick">
      Pick a conversation
    </p>
  );
});
