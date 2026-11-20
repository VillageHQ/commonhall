# Notes: alerts on the phone and the installable web app (how it works today)

Built 19 Nov 2026 (round 5, part "notifications"). Spec: `SPEC.md`. Proof: `reports/`.

## The pieces
- **`src/platform/notifications/`** (platform: no product opinion, any module may import it)
  - `contract.ts`: the kinds (`intro`, `answer`, `message`, `voice_room`, `voice_broadcast`, `library`), device
    registration and preference schemas, API paths. Client-safe, relative imports (schema.ts imports it).
  - `schema.ts`: `notification_device` (a browser's Web Push subscription or an Expo token; `address` is unique, so a
    device registered again moves to whoever signed in on it), `notification_preference` (no row = alerts on, every
    kind, no quiet times, no pause; `off_kinds` lists kinds turned off so a new kind starts on; `paused_until`;
    `let_direct_through`, on by default; the old `quiet_*` columns are read by nothing and go in a later release),
    `notification_quiet_time` (up to 3 per member: from, to, all day, days; migration 0045 copied each window that
    was on), `notification_mute`.
  - `rules.ts`: pure. `isInQuietTime` (any of the member's quiet times, in their own time zone; an overnight time's
    morning belongs to the day it started; all day covers its days 00:00–24:00), `readQuietUntil` (when the joined
    quiet times covering now end), `readLocalMoment` (08:00 tomorrow on the member's clock) and `readSkipReason`
    (off → kind off → muted (broadcast kinds only, `MUTABLE_KINDS`) → paused → quiet hours). A quiet time holds back
    portfolio kinds only while Let through is on: `DIRECT_KINDS` (`intro`, `message`, `answer`) still come. A pause
    holds back every kind. A new kind is a portfolio kind unless it joins `DIRECT_KINDS` (contract.ts). Round 6,
    part 4: `.ai/features/notify-schedule/SPEC.md`.
  - `notify.ts`: **`notify({ userIds, kind, title, body, url, fromUserId? })`**, the contract voice rooms and the store
    app use. Returns `{ sent, skipped, failed, removed }`: `skipped` counts members, the others count devices. The
    sender never alerts themselves. `notifySoon(input | async () => input)` runs it after the response
    (`runAfterResponse`) and only logs a failure, for code that must not wait on alerts. `sendTestAlert` goes
    straight to one member's devices, whatever their choices (it proves the device).
  - `log.ts`: the alert log, for checking who got which alert (round 6, part 0). Only in demo mode and development:
    notify() writes one `notification_log` row per member (sent, or skipped with `readSkipReason`'s reason; "sent"
    means their choices let it through, not that a device got it), `sendTestAlert` one `test` row when the member has a device. Kept 7 days (older
    rows go on each write). `/me/alerts/log` lists the member's last 20, and is a 404 outside demo and development.
  - `send.ts`: one delivery. Web Push is built by the `web-push` package (`generateRequestDetails`) but sent with
    `fetch`, so demo mode's fetch guard blocks real push services and tests reach a fake. 410 = gone (device
    removed); 404 = unknown (removed only when the device is older than 10 minutes: a push service can answer 404 for
    a subscription made seconds ago); anything else is logged and counted failed. Expo: one POST to
    `https://exp.host/--/api/v2/push/send` (`EXPO_PUSH_URL` overrides it, for tests); a `DeviceNotRegistered` ticket
    removes the token.
  - `push-hosts.ts`: a Web Push endpoint must be https on a browser push service (FCM, Mozilla, Windows, Apple), no
    port. Checked at registration (422) and again before every send (a stored row that fails is removed), so a member
    can't make the server call an address of their choosing. `PUSH_TEST_ORIGIN` lets the tests' fake server in;
    never set it in production.
  - `vapid.ts`: each server's own VAPID key pair, made on first start (`instrumentation.ts`, after migrations) and
    on first need, stored in `instance_settings.vapid_keys` (first writer wins). Kept through a demo reset. The
    subject is the app's https origin, else `mailto:alerts@<host>`.
  - `app-icon.tsx`: the installed app's icon (192/512 PNG, `next/og`): the fund's logo on paper (an uploaded PNG/JPEG,
    or a logo address that is a PNG/JPEG/SVG file in `public/`; an https address is never fetched), else its first
    letter on its brand colour. The mark keeps to the middle 60% (maskable).
  - `browser.ts`: `forgetThisBrowser()` (unsubscribe + forget on the server), used by "Turn off on this device" and
    by every sign-out (`platform/auth/sign-out.ts`).
- **Routes** (owned by the platform manifest, `/api/notifications`): `POST|DELETE devices`, `PUT|POST preferences`
  (`{ isOn, offKinds, quietTimes, timeZone, letDirectThrough }`, which replaces the quiet times), `POST pause`
  (`{ until: "1h" | "tomorrow" | null, timeZone? }`; the browser's zone becomes the member's only before their first save),
  `POST mutes`, `POST test`, `GET icon?size=`. All member routes but the icon.
- **`src/app/manifest.ts`**: the web app manifest from branding (name, a short name of whole words up to 12
  characters, the brand colour, the icons; opens on `/today`). `page-metadata.ts` adds the iPhone home-screen icon and
  `appleWebApp`.
- **`public/sw.js`** (served `no-cache`, `Service-Worker-Allowed: /`): shows each push, opens the alert's page on a tap
  (an open window first), re-registers on `pushsubscriptionchange`, and answers page loads with `public/offline.html`
  when the network is gone. Nothing else is cached.
- **Screens**: Alerts at `/me/alerts` (members manifest; from the avatar menu, My profile and the bell on Rooms,
  whose `?from=rooms` makes the back link go to Rooms): `components/alerts/device-alerts-card.tsx` (this device:
  Turn on is the only place the browser asks for permission; off; test), `pause-card.tsx` (1 hour · Until tomorrow,
  or Resume), `alert-settings-form.tsx` (Quiet times: the time zone (the browser's until the first save, which keeps it; then the saved one)
  with Change, each quiet time in one line with Edit and Remove, the presets and Custom; Let through; What alerts
  you: All alerts, then "Sent to me" and "From the portfolio", one switch per kind whose feature is on). Every change
  there saves at once; a refused one (a fourth quiet time) shows its line and goes back. `muted-people.tsx` (folded).
  `alerts-bell.tsx` (server): "Alerts on", "Paused until 14:30", "Quiet until 18:00" or "Alerts off", from
  `readAlertState(database, userId, now)`; placed in `src/app/(app)/rooms/page.tsx`. `alert-words.ts` holds the shared
  words (days, until when).
  Today shows `install-card.tsx`: Chrome/Edge's install prompt, or the Share › Add to Home Screen steps on iPhone;
  shown on one visit only (round 7: `localStorage` marks it when first shown or closed), never once installed or
  inside the store app.

## Events wired today
| Event | Who | Kind | Where |
|---|---|---|---|
| An intro ask | the connector | `intro` | `modules/intros/service.ts` `createIntroRequest` → `alerts.ts` |
| The connector says no, or the person says no | the asker | `answer` | `transitionIntro` (decline), `service-consent.ts` `tellEveryoneAboutNo` |
| The person says yes | the asker and the connector | `answer` | `service-consent.ts` `tellEveryoneAboutYes` |
| A new message | the recipient | `message` | `modules/messages/service.ts` `sendMessage` → `alerts.ts` |
| "I'm available to talk" | every member (not blocked either way) | `voice_broadcast` | `/api/voice/available` → `shell/voice-alerts.ts` |
| A scheduled room starts | members who tapped Remind me | `voice_room` | `/api/voice/start` and job `voice-reminders` → `shell/voice-alerts.ts` |

Alerts never carry a message's words, an intro's note or reason, or whose no it was. A withheld message or intro
(a block) sends no alert. A new kind adds its row to `KIND_FEATURES` in `src/app/(app)/me/alerts/page.tsx`.

## For the parts that build on this
- voice-sessions: call `notify()` (or `notifySoon`) with `voice_room` / `voice_broadcast` and `fromUserId`; mutes,
  pauses and quiet times apply by themselves; add the kinds to `KIND_FEATURES` once the feature exists.
- mobile-app (built): the app registers `{ type: "expo", token }` through the portal page (its cookie and origin), and
  each Expo message carries `data: { url, kind, origin }` (`origin` = the server's address, so a phone with several
  communities opens the right one). See `.ai/features/mobile-app/NOTES.md`.

## Known limits
- Headless Chrome can't subscribe to Web Push (no push service there); a fresh Chrome profile can take ~30 s on its
  first "Turn on alerts" (the button says "Turning on…").
- iPhone delivery was not checked on a device; the steps show, and Web Push on iOS 16.4+ needs the installed app.
- In demo mode nothing leaves the server, so the test button says so instead of sending.
