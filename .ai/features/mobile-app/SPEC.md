---
id: mobile-app
status: specced
waits-on: [notifications, voice-sessions]
size: one day
touches: ["mobile/"]
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

## Depends on / check-ins
- notifications, voice-sessions · needs: their contracts on main · owner: each part · check in: start after both merge.

## Open questions
- Which Apple and Google accounts publish the app (asked before any upload).
