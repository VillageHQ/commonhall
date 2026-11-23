# Part 5: People and profiles (search, results, the profile header)

Read [../SPEC.md](../SPEC.md) first. Starts after Part 1 has merged; runs beside parts 2, 3, 4 and 6. About 2 hours.
Evidence: [BENCHMARK.md](../BENCHMARK.md) §5 and §8. Models: LinkedIn's people search and profile, Instagram's search
field and rows, Airbnb's filter sheet. The search's behaviour, its filters and their addresses (`/people?q=…`) do not
change.

## 1. The search row (phone and web)
- The search box and "Filter" are **both 44 px with a 6 px radius** (Part 1 gives the sizes). They sit on one row with
  **8 px** between them and share a top and bottom edge.
  - On a phone, Filter is a **44×44 icon button** (Lucide `SlidersHorizontal`, 20 px) with the accessible name "Filter".
  - On the web, it keeps its label: "Filter" with the icon, 44 px.
  - When filters are on, a 16 px count pill in the community's colour sits at the button's top right.
- **The filter panel** keeps its fields, and only its frame changes. On a phone it opens in Part 1's **`Sheet`**, with a
  pinned footer row: "Clear all" (a 16 px/600 underlined
  text button) on the left and a primary **"Show N people"** (44 px) on the right, as Airbnb does. On the web it stays where
  it opens today, with the same two buttons at its end.
- Under the row, a **chip row (32 px chips)** 12 px down: the views and roles that today sit behind links or the panel's
  first switch, as one-tap chips. "Everyone" (active by default) and "Mentors and experts" (today's link) at least;
  if the panel's view switch has more values, each becomes a chip. The chips are the same filters, not new ones.
- The count line ("20 members", "4 matches") is 13 px `--graphite`, 12 px under the chips.

## 2. A person in the results (phone and web)
LinkedIn's row, built with Part 1's **`ListRow`** (72 px, a 48 px avatar at x 16, the text at x 76, a hairline from x 76).
- Line 1: the name at **16 px/600** (Plex Sans, as the Inbox's; the serif stays for page titles).
- Line 2: "Title, Company · City" at 15 px `--graphite`, one line with an ellipsis. The company's 16 px logo comes
  before it when there is one. When there is none, a **16 px placeholder square** (`--vellum`, the company's first letter
  at 10 px/600) takes its place, so line 2 always starts at the same x. With no company, line 2 starts at x 76 with no
  square.
- In the slot under line 2, only when there is one: at most **two 24 px tags** ("Hiring · 2 open jobs", "Mentor"), 12 px/500, radius 6,
  on one line. More than two shows "+1" as a third tag.
- The whole row is one link to the profile, as today.
- After the results, today's "Not who you need? Search their networks for '…'" becomes a **56 px row** with a 20 px icon,
  the text at 15 px, and a chevron.
- **The web:** a **single column** of the same rows in Part 2's content width (from two columns), so the eye runs down one
  list, as on LinkedIn's web search. The book-a-call button, where it shows today, stays at the row's right as a 36 px
  outlined button.
- **Empty search:** Part 1's `EmptyState` with a `Search` icon, "No one matches '…'", the line "Try a name, a company or a
  skill.", and the networks row under it. The chips stay.

## 3. A profile (phone)
LinkedIn's and Instagram's header.
- The header is **stacked and left-aligned**, with no floating photo:
  - the **96 px** avatar at x 16, 16 px under the bar;
  - 12 px under it, the name at **24 px** Newsreader 600;
  - the headline ("Founder & CEO, Ledgerline") at 16 px;
  - the place at 14 px `--graphite`;
  - the tags (Series A, Fintech, Fund II) as one row of 24 px tags, 12 px under that.
- **Actions: one row, 16 px under the tags.** On someone else's profile: **"Ask for an intro" (primary) and "Message"
  (outlined), each 36 px and of equal width, then a 36×36 "More" button ("…")**, 8 px apart. When the two labels can't
  fit on one line each (a 360 px phone, large text), the two buttons stack at full width with "More" beside the second;
  a label never wraps inside a button. "More" opens Part 1's `Sheet` with today's other choices: **"Don't notify me about <first name>'s
  rooms"** (today's switch, in the same words, showing its state) and **"Block <name>"**. "Book a call", where it shows
  today, replaces "Message" as the outlined button, and Message moves into "…". On the member's own profile: today's own
  actions in the same row shape ("Edit card", plus the one other button it shows today).
- **Sections:** each card has an 8 px radius, 16 px of padding and **16 px between cards** (never 0). Each section title
  is 19 px Newsreader 600; the body is 16 px. "Working on now" keeps its serif body.
- **Job tiles:** "Apply ↗" becomes a **36 px outlined button with a 6 px radius** (no pill), full width inside its tile.
- "Block" moves into "…", so the text button at the end of the page goes. There is no footer (Part 2).
- **The web:** the same header with the avatar on the left (96 px) and the text and action row beside it. The two
  columns of sections stay. The action row's buttons are 36 px and sized to their text (not half the width).

## Files this part owns
`src/modules/members/components/member-directory.tsx`, `profile-head.tsx`, `block-member-button.tsx`,
`book-call-button.tsx` (size only), `src/app/(app)/people/**`, `src/shell/people-screen.tsx`, `src/components/alerts/room-mute-button.tsx` (it moves into
"More"), `src/modules/messages/components/start-conversation-button.tsx` (its size and place on the profile),
`src/modules/job-board/components/shared/company-jobs-card.tsx` (the Apply button), a new `src/modules/members/components/people.css`, and the People function in `src/shell/tab-outlines.tsx`
(it must match the new first screen within 8 px).

## Checks (the verifier drives these)
1. **Search row:** at 390 and 1280 px, the box and Filter are both 44 px with a 6 px radius, and their top and bottom
   edges match (±0 px). At 390, Filter is 44×44 with the accessible name "Filter".
2. **Filter sheet:** at 390, Filter opens a bottom sheet with "Clear all" and "Show N people" (44 px) pinned at its foot.
   Choosing a filter and "Show N people" gives the same results and address as today's panel. The filter count pill
   appears on the button.
3. **Chips:** "Mentors and experts" as a chip gives the same list as today's link. "Everyone" brings back the full list.
4. **Rows:** every row is at least 72 px, with a 48 px avatar, text at x 76, and a 16 px/600 name. Line 2 starts at the
   same x on every row that has a company, logo or not (±0 px). At most 2 tags show.
5. **Web:** at 1280, the results are one column.
6. **Empty:** "zzzz" shows the empty state and the networks row.
7. **Profile at 390:** the avatar is 96 px and its left edge lines up with the name's (±0 px), with nothing beside it.
   The action row's two buttons are equal width and 36 px, with "More" at 36×36 (accessible name "More"). At 300 px wide they stack and no label wraps. "More" holds "Don't notify me about Priya's
   rooms" (which toggles as before) and "Block Priya Shah" (which works as before). No 52 px or two-line button remains.
8. **Cards:** every gap between profile cards is 16 px. "Apply" is 36 px with a 6 px radius.
9. **Outline:** tapping People from another tab, the outline's search row and first result line up with the real page
   within 8 px.
