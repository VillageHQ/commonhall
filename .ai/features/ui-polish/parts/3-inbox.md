# Part 3: Inbox (the list, the thread, the web's two panes)

Read [../SPEC.md](../SPEC.md) first. Starts after Part 1 has merged; runs beside parts 2, 4, 5 and 6. About 3 hours.
Evidence: [BENCHMARK.md](../BENCHMARK.md) §3. Models: Airbnb's and LinkedIn's inboxes, then Instagram and Telegram.
Nothing new is stored, and no action is added:
- Per-conversation unread counts already exist (`unreadCount` in `src/modules/messages/contract.ts`). The list just
  doesn't show them yet.
- Block, and Delete and Report on a message, exist today and only move.

## 1. The list (phone)
- **Head:** the title "Inbox" (28 px, as every tab root), then the chips **All / Intros** (32 px), 12 px under it.
- **Every row is Part 1's `ListRow`** (72 px, a 48 px avatar, the text at x 76, a hairline from x 76):
  - **Messages:**
    - line 1 holds the name (16 px/600) and the time (13 px, right): "14:05" today, "Tue" this week, "21 Nov" before
      that;
    - line 2 is the last message (15 px `--graphite`, one line), starting with "You: " when it is the member's own;
    - unread rows use `ListRow`'s unread state, with the count as the pill when it is more than 1.
  - **Intros:** the same row.
    - Line 1 is the other person's name and the time.
    - Line 2 says what the intro is about, in today's words for its state, shortened (for example "Asks you for an intro
      to Rachel Kim").
    - When the member must answer, **"Answer" is a 36 px outlined button in the slot under line 2**, as Airbnb's "Complete
      booking". It answers **in place, as today** (`target-member-ask.tsx` answers inside the row).
    - Otherwise today's status word sits at the right of line 2, 13 px `--graphite`.
    - This part owns `target-member-ask.tsx`, which Today shows too (Part 4 places it there unchanged), so the row looks
      the same on both tabs.
- **Order:** today's sections, "Waiting on you" and then "Messages", with `SectionLabel`s. Under the Intros chip, today's
  groups, the same way.
- **Empty:** Part 1's `EmptyState`: an `Inbox` icon, "No messages yet", the line "Message someone from their profile, or
  ask for an intro.", and the button "Find someone" (to People). The chips stay above an empty filtered list.
- No footer (Part 2) and no extra space under the list.

## 2. The thread (phone): a pushed screen with its own header
- The thread carries `data-pushed-screen` and `data-own-header` (Part 1's contract): no tab bar and no community bar.
  `BackLink` renders nothing here (Part 2).
- **Header (52 px + `var(--sat)`, sticky):**
  - a back button (24 px `ChevronLeft`, the label "Inbox", 44 px tall);
  - a **32 px avatar** and the **name (16 px/600)**, with a 13 px `--graphite` line under it: their title and company,
    as their profile shows them. The avatar and name together are one link to the profile;
  - a **44×44 "More" button** ("…") on the right, opening a `Sheet` with today's thread action, "Block <name>".
- **The intro block** at the top of the message list (Instagram's), scrolling away with the messages:
  - a 64 px avatar, the name at 20 px Newsreader, and their line;
  - a 36 px outlined "View profile";
  - today's note "Replies by email land here too", as a 13 px `--graphite` line.
- **Bubbles** (fork 3):
  - Mine are on the right, filled `--ink` with `--paper` text. Theirs are on the left, `--leaf` with a 1 px `--rule`
    border.
  - Text is 16 px/22 px, with 10 × 14 px of padding.
  - The radius is **18 px**. The last bubble of a group has **6 px** on the corner on its speaker's side, at the bottom.
  - A bubble is at most **78%** of the width.
  - Bubbles in a group sit 4 px apart, groups 12 px apart.
  - A day change is a **centred 12 px/600 pill** ("Today", "Mon 17 Nov") on `--vellum`.
- **Meta:** the time (12 px `--graphite`) shows under the last bubble of a group, with "by email" when it applies.
  **Tapping a bubble** shows its own meta line under it (its time, "by email", and **Delete** for the member's own message
  or **Report** for the other person's, as today). A second tap hides it. Each bubble is a button with an accessible name
  (the sender and the time), so the keyboard and screen readers reach it too.
- **Composer, pinned** at `bottom: var(--bottom-stack)` (the inset, plus the mini player when it shows):
  - a bar on `--paper` with a hairline on top and 8 px of padding;
  - a text box: **20 px radius**, `--vellum` fill, no border, 16 px text, **40 px** high at first and growing to 5 lines
    (120 px);
  - a **40 px round Send** button (ink, a 20 px `ArrowUp`, accessible name "Send"), grey and disabled until there is text;
  - the box and Send share their bottom edge (±0 px).
  - Enter adds a line on a phone. On the web, Enter sends and Shift+Enter adds a line.
- The thread opens scrolled to the newest message.

## 3. The web (1000 px and up): two panes
Models: LinkedIn's messaging and Airbnb's inbox on the web.
- `/inbox` shows the list in a **left pane of 360 px** and the open thread on the right. With no thread open, the right
  pane shows a centred 15 px `--graphite` line, "Pick a conversation".
- Opening a row puts its thread in the right pane and changes the address to `/inbox/<id>`, so links and Back work.
  The selected row has a `--vellum` fill and a **3 px `--fund` bar on its left**.
- Both panes sit in one card (8 px radius, a 1 px `--rule` border, a 1 px divider between them). The card fills the
  window's height below the demo banner, the founder-view strip when it shows, and the page's top padding. Each pane scrolls on its own.
- The thread pane has the same header, bubbles and pinned composer as the phone, with bubbles at most 560 px wide. On the
  web the header keeps no back button.
- An intro row on the web answers in place, as on the phone.

## Files this part owns
- `src/app/(app)/inbox/**` and `src/app/(app)/messages/**`.
- `src/modules/messages/components/**`, except `start-conversation-button.tsx`, which is Part 5's.
- In `src/modules/intros/components/`: `target-member-ask.tsx` and `intros-list.tsx`.
- A new `src/modules/messages/components/inbox.css`.
- The Inbox function in `src/shell/tab-outlines.tsx`: the chips, a `SectionLabel`, and `OutlineListRows`. It must match
  the new list within 8 px.

## Checks (the verifier drives these)
1. **Rows:** at 390 px, every Inbox row (intro and message) is at least 72 px, with a 48 px avatar at x 16 and the text at
   x 76. Every name is 16 px/600, and every time 13 px at the right of line 1. Screenshot both kinds.
2. **Unread:** as Maya, send Sam a message. On Sam's Inbox the row's name and preview are ink and 600, with a dot, and
   the tab badge counts it. Open the thread and go back: the dot is gone.
3. **"You:":** where the last message is Sam's own, the preview starts with "You: ".
4. **Intro row:** a waiting intro shows "Answer" as a 36 px outlined button under the text. It answers in place as
   before, on Inbox and on Today.
5. **Thread:** at 390 px in the app there is no tab bar and no community bar. The header is 52 px plus the inset, holds
   the back button, a 32 px avatar and the name (linking to the profile), and "More" opens a sheet with "Block Priya Shah",
   which works as before.
6. **Bubbles:** Sam's are ink and on the right, Priya's white with a border and on the left. The radius is 18 px, and no
   bubble is wider than 78% of the list.
7. **Delete and Report:** tapping one of Sam's bubbles shows "Delete" (it works as before), and tapping one of Priya's
   shows "Report". Tab to a bubble and press Enter: the same happens.
8. **Composer:** pinned. With `--sab: 34px` its bar sits 34 px over the screen's bottom edge, and with
   `--mini: 56px` on `html`, 90 px. The box and Send share a bottom edge (±0 px), Send is disabled while the box is
   empty, and typing 6 lines grows the box to 120 px, then it scrolls. Sending adds the bubble and empties the box.
9. **Long thread:** with 30 messages, the composer stays in view while you scroll.
10. **The web:** at 1280×800, `/inbox` shows two panes with a 360 px list. Clicking a row opens the thread on the right,
    changes the address, and marks the row (the fill and the 3 px bar). Back returns to the previous thread.
11. **Empty:** a member with no messages sees the empty state. Under the Intros chip with no intros, the chips stay.
12. **Outline:** tapping Inbox from another tab, the outline's first row and the real first row's tops differ by at most
    8 px.
13. **On the store build (not in the preview):** the composer stays above the keyboard while typing.
