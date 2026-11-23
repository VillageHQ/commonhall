# Part 6: Rooms (the list, the live room on the web and in the store app, the mini player)

Read [../SPEC.md](../SPEC.md) first (with its room card section). Starts after Part 1 has merged; runs beside parts 2–5.
About 4 hours. Its native changes reach phones with store build 5.
Evidence: [BENCHMARK.md](../BENCHMARK.md) §7. Models: X Spaces (the live room, the mini player), Clubhouse (the list's
cards, the faces, raise hand), Discord (the empty room's words).

**Nothing about how rooms work changes** (round 7): how they start, alert, end, count, or move people. Every control
that exists today stays, and none is added:
- for everyone: Leave, React, Chat (web), Raise or Lower hand, Mute and Unmute, stepping down from the stage;
- for hosts: Invite to speak (it puts a listener on stage at once, as today), Move to audience, Make or Remove co-host,
  Rename, End room.

## 1. The Rooms list (phone and web)
- **Head:** the title "Rooms", with **"Start a room"** as a **primary 36 px button on the title's row, at the right**
  (one tap, as round 7 made it). "Schedule for later" stays as today's 13 px link, under the title.
- **Sections:** a `SectionLabel` "Live now", its room cards, then "Coming up" and its cards.
- **Live cards** are **SPEC.md's room card**, exactly.
- **Coming up** cards use the same frame. In place of "Live", the time (13 px/600); then the title; then the host's
  28 px face and name; and a 36 px outlined "Remind me".
- **Empty** (nothing live, nothing coming): Part 1's `EmptyState` with an `AudioLines` icon, "No one's in a room right
  now", and the line "Start one and everyone hears about it." It has no button: Start a room is in the head.
- **Room alerts** (the switch and "Quiet times") move to the **end of the page**, as one 56 px row:
  - a 20 px `Bell` icon, "Room alerts" at 15 px, and today's switch on the right;
  - "Quiet times" as a 13 px link under the label.
  - Its behaviour stays the same.
- No footer (Part 2).
- **The web:** the cards sit in a grid of 2 columns at Part 2's content width, each row the same height.

## 2. The live room on the web (phone browser and 1280 px)
- The room page carries `data-pushed-screen` and `data-own-header`, so on a phone it has no tab bar and no community bar.
  It draws one header. Today's `BackLink` call goes; its link moves into the header's back button.
- **Header (52 px + `var(--sat)`):**
  - on the left, a back button: `ChevronLeft` and "Rooms", doing what today's "Back to Rooms" does;
  - on the right, **"Leave"** as a 15 px/600 text button in the live colour, doing what today's Leave does. For a host,
    "End room" takes this place and Leave moves into "More";
  - then a 44×44 **"More"** button ("…") opening a `Sheet` with Rename (host) and whatever today's page offers there.
  - On the web (1000 px and up) the same row sits at the top of the room's column.
- **Title:** 22 px Newsreader 600, at most 3 lines. Under it, one 14 px `--graphite` line: the host's name and the number
  of people in the room.
- **One face grid** (X Spaces):
  - **Columns at least 84 px wide**: 4 at 390 px, 3 at 360 px, 6 at 1280 px. Faces are **64 px** and round.
  - Under each face: the name (13 px/600, one line with an ellipsis) and a **role line** (12 px `--graphite`): "Host",
    "Co-host", "Speaker" or "Listener". A raised hand shows as a `Hand` icon plus "Hand up", in the live colour, on two
    lines if it must.
  - People on stage come first, then the rest, each group under a `SectionLabel` ("On stage", "Listening").
  - **Badges on the face:** a 20 px muted-mic circle at the bottom right of a muted speaker, and a **2 px ring** that
    pulses around whoever is talking (today's speaking state).
  - Tapping a face opens today's per-person actions (Invite to speak, Move to audience, co-host) in a `Sheet`.
  - "Nobody on stage yet." stays, as a 15 px `--graphite` line in the stage's place.
- **Bottom bar**, pinned at `bottom: var(--bottom-stack)`, 88 px tall, on `--paper` with a hairline on top:
  - **The one main control**, on the left: a **56 px round button with a 12 px caption under it**. For a listener it is
    the hand: "Raise hand", or "Lower hand" with the button ink-filled. For someone on stage it is the mic: "Mic off"
    (outlined, a crossed mic) or "Mic on" (ink-filled).
  - **On the right:** **44 px round icon buttons with Lucide icons** (24 px, stroke 1.5), 8 px apart: **React**
    (`SmilePlus`) and **Chat** (`MessageCircle`). Each has an accessible name. No button uses an emoji as its icon; the
    reaction picker's emoji are the content and stay.
  - Leave is not in the bar: it is in the header, as in X and Clubhouse.
- **Raise hand** (fork 4): one tap raises it and shows a toast for 2.5 s, "Hand raised. The host sees it." Hosts see a
  **"Raised hands (N)" chip** (32 px) above the bottom bar, which opens today's list of raised hands.
- **Brought on stage:** today, a host's "Invite to speak" puts the listener on stage at once. When that happens, the
  member sees a **banner across the top** for 6 s (`--ink`, `--paper` text, 56 px): "<Host> brought you on stage. Your
  mic is off." It has two actions: **"Unmute"** (36 px, `--paper` fill), which does what the mic button does, and
  **"Back to listening"**, which does today's step-down. The banner only describes and shortcuts what already happened.
- **Chat and React** keep their panels. On a phone each opens in a `Sheet` (at most 60% of the screen); on the web they
  stay as today's panels.

## 3. The live room in the store app (native, `mobile/src/voice/RoomScreen.tsx`) (fork 7)
The same design as §2, drawn natively:
- **Fonts:** Newsreader for the title and IBM Plex Sans for everything else, loaded with `expo-font` from the same font
  files the site serves. No Georgia, and no `system-ui` for text.
- **Icons:** the same Lucide icons (`lucide-react-native` on `react-native-svg`). No emoji or text characters as icons:
  ✌ ☺ ✋ and the "↓" arrow go.
- **Colours:** `mobile/src/theme.ts` takes the site's token values for paper, ink, rule and graphite, and the live
  colour. Its rust (`#a4442a`) changes to the site's value. **The live dot is that colour, not green.** `theme.ts` keeps
  its dark palette (chosen by `useColorScheme()`), and there the live colour takes the site's dark value (`#e7a57e`).
- **The screen is a sheet:**
  - it slides up over 250 ms, with a 16 px top radius, its top at `insets.top + 8`, and the web view dimmed behind it;
  - a drag down of 120 px or more on its header minimises it, and so does the chevron.
- **The layout:**
  - a 44×44 `ChevronDown` on the left, to minimise (accessible name "Minimise");
  - then §2's header items: Leave or End room, and "More" with Rename for hosts;
  - the title, the face grid, and the bottom bar with the 56 px main button and React.
  - The app has no chat today, and it doesn't get one. The face grid fills the middle; nothing else is added.

## 4. The mini player (native, `mobile/src/screens/PortalScreen.tsx`) (fork 5)
X's docked bar.
- **Where it sits:** when the room is minimised, a **56 px bar sits directly above the site's tab bar**. The tab bar is
  56 px visible (Part 2's contract) plus the inset, but it grows with large text, so the app never assumes 56: the page
  reports the tab bar's **measured** visible height in its "frame" message (below), and again whenever it changes. The
  mini bar is absolutely positioned over the web view at `bottom: insets.bottom + <reported height>`, full width, on
  `--ink`. The web view keeps its full height; it no longer shrinks. The mini bar is 56 px at least and grows with large
  text.
- **Content:**
  - the live dot, the room's title (15 px/600 `--paper`, one line), and "Listening" or "On stage" (13 px, 75% opacity)
    under it;
  - on the right, two **44×44 icon buttons**: the main control (the hand or the mic, with §2's states and names) and
    **Leave** (`X`, accessible name "Leave");
  - a tap anywhere else opens the room's sheet again.
- **The page makes room for it.** The bridge gets these messages (both sides are this part's: `mobile/src/lib/bridge.ts`
  and `src/platform/native-app/bridge.ts`):
  - **app → page, "mini player on/off" with its height:** the page sets or clears `html[data-mini-player]` and sets
    `--mini` to that height. Part 1's `--bottom-stack` then lifts everything pinned at the bottom by it.
  - **page → app, "frame":** the page says it supports this layout, whether its tab bar is showing (a pushed screen hides
    it), and the tab bar's measured visible height. It sends it again when any of these change (a `ResizeObserver` on the
    bar). On a pushed screen the bar sits at `bottom: insets.bottom`.
  - **page → app, "sheet open":** the page watches `html[data-sheet-open]` (Part 1's `Sheet` sets it) and reports it. The
    mini bar hides while a sheet is open.
  - The mini bar also hides while the keyboard is open (React Native's keyboard events).
  - **Older sites:** a community still running an older site never sends "frame". Store build 5 then keeps today's
    layout: the bar sits under the web view and the web view shrinks.

## Files this part owns
- `src/modules/voice/components/**` (with `voice.css`) and `src/app/(app)/rooms/**`.
- `src/platform/native-app/bridge.ts` (the page's side).
- In `mobile/src/`: `voice/**`, `screens/PortalScreen.tsx`, `theme.ts` and `lib/bridge.ts`.
- `mobile/package.json` and its lock file: `react-native-svg`, `lucide-react-native` and `expo-font`, at the versions
  Expo's SDK pins.
- The font files, copied into `mobile/assets/fonts/` with their licence texts.
- The Rooms function in `src/shell/tab-outlines.tsx`. It must match the new first screen within 8 px.
- The store build itself is the round's next step, not this part's.

## Checks (the verifier drives these; the native ones in the store app's web preview)
1. **List:** at 390 px, "Start a room" is 36 px on the title's row. Live cards follow SPEC.md's room card (8 px radius,
   17 px/600 title, a 40 px first face, a 36 px Join). Tapping the card outside the button joins. "Room alerts" is the
   last row, and its switch still turns alerts on and off. At 1280 there are 2 cards per row.
2. **Web room at 390 px:** there is no tab bar and no community bar. One header holds "‹ Rooms", Leave and "More". Faces
   are 64 px, in 4 columns (3 at 360 px), each with a role line. The bottom bar has the 56 px main button with its caption
   on the left, and React and Chat on the right. No button's text or icon is an emoji: read every button's accessible
   name and contents; the reaction picker's emoji are allowed.
3. **Hands and stage:** as Sam, tap Raise hand. The button turns ink with "Lower hand", and the toast shows. Maya (the
   host, another browser) sees "Hand up" under Sam's face and a "Raised hands (1)" chip. Maya taps Invite to speak: Sam
   is on stage at once (as today) and sees the banner. "Unmute" turns his mic on, and "Back to listening" steps him down.
4. **App room** (web preview at 390): the title's computed font family is Newsreader, the buttons draw SVG icons, and
   the live dot's colour is the site's live colour. The sheet leaves the top 8 px clear (the insets are 0 in the preview).
5. **Mini player** (web preview, insets 0): minimise.
   - A 56 px bar appears, and its bottom edge meets the tab bar's top edge (±1 px). The tab bar is fully visible under it.
   - The main control and Leave are each 44×44. Leave leaves (the page shows "You left the room."), and the hand button
     raises the hand. Tapping the title reopens the room.
   - On store build 5, the same layout holds with the real home-indicator inset.
6. **Page padding:** with the mini player showing, scroll Today to the end. The last item is fully visible above the
   mini player.
7. **On a thread:** with the mini player showing, open an Inbox thread (after Part 3, or any page with
   `data-pushed-screen`). The bar sits at the bottom inset, and the thread's composer sits right above it, uncovered.
8. **Sheets:** with the mini player showing, open the menu sheet. The mini bar hides, and it comes back when the sheet
   closes.
9. **Reduced motion:** the room's sheet opens without sliding, and the speaking ring shows solid instead of pulsing.
10. **Outline:** tapping Rooms from another tab, the outline's head and first card line up with the real page within 8 px.
