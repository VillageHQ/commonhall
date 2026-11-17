# Notes: Connect Village (how it works now)

- **The screen:** `src/modules/network/components/village-connect.tsx` (`VillageConnect`, a client component).
  Props: `appUrl` (VILLAGE_APP_URL as the server resolved it, default https://village.ai), `connectedAppName`
  (`null` = boxes open; a string = folded "Connected to <name>"; `""` = connected with no name kept, shown as
  "your Village app"), `onConnected(appName)` (the guided start's step 2 turns "Next" on with it; keep the name).
- **Links:** `villageConnectLinks(appUrl)` in `src/platform/village/links.ts`: `/platform`, `/platform/onboarding`,
  `/platform/settings/api-keys`, each opening a new tab.
- **No Save button:** once both boxes hold a non-blank value, a 600 ms pause starts the check
  (`POST /api/admin/village/keys`: verify with Village, then save). One check at a time: a pair typed during a check
  waits and runs after it. If the running check saved its pair while a box changed, the screen still takes it as
  saved (pill, `onConnected`, "Keep the saved keys") and shows the waiting pair's answer beside it.
- **The app's name:** the keys route answers `{ message, appName }` (`villageKeysResponseSchema` in
  `contract-village-admin.ts`). `verifyAndSaveVillageKeys` reads Village's `GET /v2/app` once (title and public key),
  and keeps the title in the `village_app_name` setting with the keys; `readVillageAppName` reads it for the page.
  Keys saved before this change have no name until they are pasted again.
- **Tried keys never touch Village's health:** the check runs on a "trial" Village connection
  (`VillageConnection.isTrial`, its own cached SDK app without the health hook). Before, a mistyped key recorded
  "keys refused" for the community: the banner, members' "Search is unavailable", and the admin alert email.
  A successful save clears any old trouble (`recordVillageOutcome(database, null)`), since Village just answered.
  A Village outage during a check is still recorded as one (it is real).
- **Set up › Village:** the Connection card holds the pill, "Village calls go to …" when connected, a key problem
  notice, the last test result, `VillageConnect`, "Test the connection", the address line and the group step. The old
  keys form, the "set on the server" key lines, the "Running it yourself" box and the "Platform Admin › Settings ›
  API keys" hint are gone from this page (`SelfHostBox` in `components/plumbing-notes.tsx` still serves Mail).
- **Not changed:** the setup checklist still uses the older `KeysForm` (`components/keys-form.tsx`); moving it is
  the guided start's job.
- **Tests:** `components/village-connect.test.ts` (links, auto-check with no click, a failure's reason and the
  re-check, one check in flight, the save-during-edit race, folded start and focus on replace);
  `village-admin.test.ts` (the route answers and keeps the name; a refused trial key leaves health alone; a save
  clears an old notice).
- **Proof:** `reports/` (screens 1–4 and `proof-run.txt`), the verifier's two rounds in `reports/verifier/` and
  `reports/verifier-round2/`.
- **Seen, not changed:** the last "Test the connection" result stays on the page if the keys are deleted straight from
  the database (no screen deletes them); each refused check logs two Village lines (the SDK's own retry).
