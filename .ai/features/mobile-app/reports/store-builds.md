# Proof: store builds (19 Nov 2026)

Real output, read back from the services after the run.

- **iOS:** EAS build `25bc0f06-22e0-4511-adbe-02025cc260c2` (profile `testflight`, 1.0.0 build 1): FINISHED.
  EAS submission `ae6e8cba-5b7f-4898-beff-d5b805513035`: FINISHED.
  App Store Connect (API, app 6836913644): `BUILD ae691a78-… 1 VALID usesNonExemptEncryption=false`,
  `internalBuildState: IN_BETA_TESTING`, `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only).
  Internal group "Absi" (all builds) with one tester.
- **Android:** EAS build `7010ea28-1e86-4603-83c3-5ceeb782fcd4` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/d3gsb6nnU0fFxXX_FT7G-OHRsUrxUK1TZ37zldXsGoM.apk
- **Push:** Expo project iOS credentials `64b1ac9c-…` carry push key `633797XK4M` (Production, `ai.commonhall.app` only).
- **Checks:** `npm run typecheck` clean, `npm test` 13/13, `public-repo` + `site-tour` tests 11/11.

Not covered: nobody has installed either build on a phone yet, so a real alert on a device, background audio with the
screen locked and the Android voice service still wait for the owner's phone test.

## Build 3 (20 Nov 2026, after the room hand-off)
- **iOS:** EAS build `e236a56b-62ff-4755-9ee8-1fc2884ca626` (profile `testflight`, 1.0.0 build 3): FINISHED.
  EAS submission `6b7c69b0-6127-495b-addb-e1cfc28cd458`. App Store Connect: build 3 `VALID usesNonExemptEncryption=false`,
  `internalBuildState: IN_BETA_TESTING`, `externalBuildState: READY_FOR_BETA_SUBMISSION` (not submitted: internal only);
  group "Absi" (internal, all builds).
- **Android:** EAS build `5ebc6c79-ba40-4eb6-84ac-948cc0aa70c2` (profile `preview`): FINISHED, an APK:
  https://expo.dev/artifacts/eas/TPMVdOB3W9OE8kQYqKYhyFkkqYrp3sfIIEnwjiLmI-I.apk
- **Web-preview check:** `build3/README.md`.
