---
id: onboarding-village-connect
status: building
---
# Connect Village: 3 links and 2 paste boxes

Approved by Absi on 17 Nov 2026 (decision page "Commonhall: the organizer's first-run setup", question 3: test the
keys as soon as both are pasted).

## What it does
The Connection part of Set up › Village becomes one small reusable screen, `VillageConnect`
(`src/modules/network/components/village-connect.tsx`), used on /admin/village and in step 2 of the guided start.
- One line on what Village does for the community: it shows which members know whom.
- Three numbered links, each opening a new tab:
  1. "Create a developer account" → https://village.ai/platform (the button there is "New developer account").
  2. "Finish Village's short checklist" → https://village.ai/platform/onboarding
  3. "Open your keys page" → https://village.ai/platform/settings/api-keys, "and copy both keys".
  The addresses come from `VILLAGE_APP_URL` (default https://village.ai), so a self-host pointing elsewhere still works.
- Two paste boxes: "Paste the secret key", "Paste the public key".
- **No Save button.** As soon as both boxes hold a value, Commonhall checks and saves them with the existing
  `POST /api/admin/village/keys` (verify, then save). The result shows right under the boxes:
  "✓ Connected to <the Village app's name>" or the plain reason the key failed. A wrong key shows at once; editing a
  box checks again (debounced, one check in flight).
- Once connected: the boxes fold into "Connected to <name> · Replace the keys", as today.
- The "Running it yourself" box and the old "From Village Platform Admin › Settings › API keys" hint leave this part.

## Depends on / check-ins
- **Guided start** (onboarding-guided-start) renders `VillageConnect` as its step 2 and needs a callback when it is
  connected (`onConnected`). Keep that prop name.
- **Settings fold** (onboarding-settings-fold) owns the rest of the Village page (limits and switches under
  Advanced). This part changes only the Connection part.
