# Commonhall for iOS and Android

One store app for every fund: a member types their community's address (or opens a `commonhall://join` link), signs in
with the 6-digit code from the sign-in email, and gets the whole portal with native alerts and voice rooms that keep
playing with the screen locked.

## Run it

```sh
cd mobile
npm install
npm test            # unit tests (node --test)
npm run typecheck
npx expo-doctor
```

The app uses native modules (LiveKit, the voice service), so it runs in a development build, not Expo Go:
`npx expo run:android` (Android Studio and a JDK) or `npx expo run:ios` (a Mac with Xcode).

### In a browser, without a phone

`scripts/web-preview.mjs` serves the app's web build and a running portal on one address, and stands in for Expo's
push service and for email:

```sh
EXPO_BASE_URL=/__app EXPO_PUBLIC_PREVIEW_PUSH_TOKEN="ExponentPushToken[webpreview0001]" npx expo export --platform web --output-dir dist-web
PORTAL=http://localhost:9715 PORT=9716 node scripts/web-preview.mjs
```

Run the portal on port 9715 with `APP_URL=http://localhost:9716`, `EXPO_PUSH_URL=http://localhost:9716/__preview/expo-push`
and, to read sign-in codes, `RESEND_API_URL=http://localhost:9716/__preview/resend` (emails show at `/__preview/mailbox`).
Open `http://localhost:9716/__app/` and join `http://localhost:9716`. Made-up people only. (In Git Bash, prefix the
export with `MSYS_NO_PATHCONV=1`, or the base path turns into a Windows path.)

## Build it (EAS)

`eas.json` has three profiles: `development` (a dev client; Android APK, iOS simulator), `preview` (internal APK and
simulator build) and `production` (store builds). Builds need the publishing account's EAS project:
`eas init` there, then set `EAS_PROJECT_ID` (push tokens need it). Nothing has been uploaded to a store; that waits for
the owner's choice of Apple and Google accounts.
