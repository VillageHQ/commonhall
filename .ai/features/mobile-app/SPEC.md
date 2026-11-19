---
id: mobile-app
status: built (store builds wait for the publishing accounts)
waits-on: [notifications, voice-sessions]
size: one day
touches: ["mobile/", "src/platform/auth/", "src/app/signin/", "src/app/api/", "src/modules/voice/components/", "src/platform/native-app/"]
---
# Spec: The Commonhall store app (iOS and Android)

**Approved:** 19 Nov 2026 by the owner (decision page "Commonhall: AI library, phone app, voice rooms"): "preferable full
app"; the browser app installs and receives alerts too (part notifications).

## Core user journey
1. A founder installs Commonhall from the App Store or Google Play.
2. First open: "Join your community": they type their fund's portal address (or open an invite link that carries it).
3. They sign in by email link or a 6-digit code (emailed links open the browser, so a code avoids leaving the app).
4. The whole portal works inside the app, with native alerts (Expo push) and native voice rooms that keep playing when the
   screen locks, with lock-screen controls. **Goal.**

## Scope
In: an Expo (React Native) app in `mobile/`: community picker and memory of the last one, sign-in, the portal in a web view
with native navigation chrome, native push registration (`POST /api/notifications/devices`, type "expo"), native voice
rooms with the LiveKit React Native SDK using the token API from voice-sessions, background audio, deep links from alerts,
EAS build profiles for iOS and Android. Out: uploading to the stores (needs the owner's yes and account), offline mode.

## Acceptance criteria
1. EAS builds succeed for iOS (simulator build) and Android (APK).
2. On the Android emulator (or a simulator run): join community, sign in by code, browse, receive a push, join a voice room
   and hear audio.
3. Voice continues with the app in the background (Android verified; iOS background mode configured and documented).
4. A push opens the right screen.
5. Unwanted path: an address that is not a Commonhall server shows a plain error, never a blank web view.

## Where it stands (19 Nov 2026)
Built in `mobile/`; how it works: `NOTES.md`. Against the criteria:
1. EAS builds: profiles ready (`mobile/eas.json`); not run. They need the publishing account's EAS project, and this
   Windows PC has no Android SDK (`eas build --local` doesn't run on Windows). The native JavaScript bundles for Android
   and iOS compile (`expo export`) and `expo prebuild` applies every plugin.
2. Journey: proven in the web preview with real clicks (join, sign in by code, browse, an alert shown and tapped, a
   voice room joined with audio arriving); not on an emulator.
3. Background voice: the Android foreground service and the iOS audio background mode are in place and documented;
   untested on a device.
4. An alert opens the right page (and the right community): proven in the preview and unit-tested.
5. A non-Commonhall address shows a plain error: proven (unit tests and the preview).
Server changes: a 6-digit code in the sign-in email (`POST /api/sign-in-code`), `app: "commonhall"` on `/api/health`,
`data.origin` on Expo alerts, and the room page handing off to the app's player. The app calls the API through the
portal page, so no token sign-in was needed.

## Depends on / check-ins
- notifications, voice-sessions · needs: their contracts on main · owner: each part · check in: start after both merge.

## Open questions
- Which Apple and Google accounts publish the app (asked before any upload).
