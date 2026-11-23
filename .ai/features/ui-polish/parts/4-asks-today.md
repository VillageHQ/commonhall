# Part 4: Asks and Today (the composer, the ask list, Today)

Read [../SPEC.md](../SPEC.md) first (with its room card section). Starts after Part 1 has merged; runs beside parts 2,
3, 5 and 6. About 3 hours. Evidence: [BENCHMARK.md](../BENCHMARK.md) §4 and §6. Models: LinkedIn's and X's composers,
Facebook's prompt row, Threads' sheet; Linear's rows and Slack's Home sections for Today. What is posted, the weekly
allowance, "Post a win instead" and the optional target do not change: only their place and look.

## 1. The prompt row (Asks and Today, phone and web)
Facebook's "What's on your mind?" row.
- A **64 px** row: the member's **32 px avatar** at x 16, then a **44 px** field-look button filling the rest (6 px
  radius, the field border, 16 px `--graphite` text "Ask the community…"). Tapping it opens the composer. It is a
  button, not a field, so the page behind never raises the keyboard.
- On Asks it is the first thing under the title. On Today it replaces the small "+ Post an ask" button (§4).
  `ASKS_COMPOSE_PAGE` (`/asks?compose=1`) opens the composer on arrival, as today.

## 2. The composer (fork 9)
**Phone (under 1000 px): Part 1's `Sheet` at `size: "full"`**, as LinkedIn, X and Threads.
- It covers the tab bar, and its top sits at `var(--sat)`.
- **Header, 52 px:**
  - "Cancel" on the left (16 px text button, 44 px tall);
  - "New ask" in the centre (17 px/600);
  - **"Post"** on the right as a **primary 36 px button**, disabled (40% opacity) until there are 2 or more non-space
    characters.
  - A hairline sits under the header.
- **Body:**
  - The 32 px avatar and the member's name (15 px/600) at the top left, 16 px under the header.
  - Beside the name, today's **allowance** as one 13 px `--graphite` line ("4 of 5 asks left this week"), with its dots.
  - Then the text box: **no border, no fill, 17 px/24 px**, as wide as the sheet minus 16 px each side, with the
    placeholder "What do you need? Who, what, by when.". It gets the focus as the sheet opens and grows with the text.
    The sheet scrolls; the box never shows its own scrollbar.
- **Toolbar, 48 px**, a hairline on top, pinned at the sheet's foot (above the keyboard on a phone):
  - two **32 px chips** with icons and short labels: **"@ Who to reach"** (`AtSign`) and **"Post a win"** (`Trophy`),
    8 px apart;
  - nothing else. With large text the chips scroll sideways; they never wrap.
  - "@ Who to reach" opens today's two optional fields ("A person or a role", "Company"; 44 px each) **inside the sheet,
    under the text box**, and the chip turns ink while they are open. Post never moves: it stays in the header.
  - "Post a win" switches the sheet to today's win posting. The title becomes "New win", the placeholder becomes
    today's win prompt, the allowance line shows only if today's rules count wins, and the chip reads "Post an ask".
- **Cancel** with text in the box opens a small `Sheet`, "Discard this ask?", with "Discard" and "Keep editing". With
  an empty box, Cancel just closes.
- **Posting** closes the sheet and shows the new ask at the top of the list, with the confirmation the page gives today.

**The web (1000 px and up): in place**, as LinkedIn's "Start a post" leads to one box.
- Clicking the prompt row turns it, in place, into a card (8 px radius, the field border). The card holds:
  - the 32 px avatar, the name and the allowance line;
  - a borderless 17 px text box of at least **120 px**;
  - a **bottom row** with the two chips on the left and **Post (44 px, primary) at the bottom right**.
- The card keeps its height while typing until the text passes 120 px; then it grows.
- The target fields open between the text and the bottom row.
- Escape with an empty box folds it back into the prompt row.

## 3. The Asks page (phone and web)
- **Order:**
  - the title;
  - the prompt row;
  - the **search box (44 px)**, 12 px under it;
  - the chips **Open / For you / Yours (32 px)**, 12 px under that;
  - the list.
- **An ask in the list:**
  - The author has a 36 px avatar, the name at 15 px/600, and the company line at 13 px `--graphite` with its 16 px logo.
  - The age sits at 13 px `--graphite` at the right of the name line. "Pinned" and "Update" sit there too, as 12 px
    `--graphite` words with their Lucide icon.
  - The body is 16 px/24 px, **cut at 4 lines** with "more" (tapping the ask opens it, as today).
  - Under the body, one row: "N answers" with a 16 px `MessageCircle` (14 px `--graphite`; no emoji anywhere on Asks).
    When it applies, today's "You could help" follows as a 13 px line with a 16 px icon, not a grey bar.
  - Items are 16 px apart, with a hairline between them.
- "How asks work" stays as today's details row at the end. No footer (Part 2).

## 4. Today (phone and web)
- **Head:**
  - the date (13 px `--graphite`);
  - the greeting as the h1 at **24 px** Newsreader (SPEC's titles), on at most 2 lines;
  - the prompt row (§1), 16 px under it.
- **Live now** (when a room is live): one card built to **SPEC.md's room card**, exactly (an 8 px radius, the line with
  the live dot and the host, a 17 px/600 title, the 40/28 px faces, a 36 px Join, the whole card joins).
- **Waiting on you:** a `SectionLabel`, then **rows, not cards**.
  - Intro asks are Part 3's `target-member-ask.tsx`, placed here unchanged.
  - Every other waiting item is Part 1's **`ListRow`**: a 48 px avatar (the asker's or the member's own), line 1 says
    what it is, line 2 the detail (2 lines at most), and its **36 px** button (Read, Answer) in the slot under line 2,
    as Inbox's.
- **You could help:** a `SectionLabel`, then cards (they carry a whole ask). Each has:
  - the 32 px avatar and name;
  - the ask (16 px, cut at 4 lines);
  - **two equal 36 px buttons**, "I can help" (primary) and "Not for me" (outlined), side by side across the card,
    8 px apart. If their text can't fit on one row, they stack at full width; a label never wraps inside a button.
- **One button size on Today:** every button in a row or card is 36 px. None at 40 or 32 px remains.
- **The end:** "More for you" as a `SectionLabel`, then Jobs, Perks and Library as **48 px rows** with a 20 px icon and a
  chevron (the menu's look), instead of a line of links. No footer (Part 2).
- "Add to your home screen" keeps its place and its ✕, with its buttons at 36 px.
- **The web:** the same order in Part 2's single content width. The prompt row opens in place (§2).

## Files this part owns
- In `src/modules/asks/`: `components/**`, plus a new `components/asks.css`.
- `src/app/(app)/asks/**` and `src/app/(app)/today/**`.
- In `src/shell/`: `today-list.tsx` (with its live card), `today-actions.tsx`, `next-step-card.tsx` and `today.css`.
- `src/components/alerts/install-card.tsx` (only its buttons).
- The Today and Asks functions in `src/shell/tab-outlines.tsx`. They must match the new first screens within 8 px, with
  the demo's seed, as Sam.

## Checks (the verifier drives these)
1. **Prompt row:** at 390 and 1280 px on Asks and Today, the row is 64 px, with a 32 px avatar and a 44 px field-look
   button. Tapping it doesn't focus a field on the page.
2. **Phone sheet:** at 390 in the app, the sheet covers the tab bar, and its top sits at `--sat`. Cancel, "New ask" and
   Post share one 52 px row. Post is 36 px and disabled while the box is empty. The box has no border, 17 px text, and
   the focus.
3. **Toolbar fits:** at 390 px the toolbar's chips are on one line. At 300 px wide they scroll sideways, nothing
   wraps, and nothing is cut.
4. **No jump:** type 3 lines. Post doesn't move (±0 px), and nothing below moves except by the box's own growth. Open
   "@ Who to reach": the two fields appear under the text, and Post stays in the header.
5. **Post works:** post an ask from the sheet. The sheet closes, the ask is first in Open, and the allowance drops by one.
   Post a win through "Post a win".
6. **Discard:** Cancel with text asks first. "Keep editing" keeps the text; "Discard" closes without posting.
7. **Web in place:** at 1280, clicking the prompt row opens the card with Post (44 px) at its bottom right. Its height
   stays the same while typing 3 short lines.
8. **Ask list:** the answer counts use the line icon (no emoji on Asks), and long bodies are cut at 4 lines with "more".
   The search box is 44 px and the chips 32 px.
9. **Today:** every button measures 36 px. Waiting items are rows of at least 72 px with 48 px avatars. Each "You could
   help" card has two equal-width buttons. The live card follows the room card spec, and tapping the card outside the
   button joins.
10. **Above the fold:** at 390×844 in the app without the demo banner, Today shows the head, the prompt row, and at least
    3 waiting rows or the live card plus 1 row. Today's build shows about 2.5 cards there.
11. **Outline:** tapping Today and Asks from another tab, the first blocks of the outline and of the page differ by at
    most 8 px.
12. **On the store build (not in the preview):** the toolbar sits right above the keyboard.
