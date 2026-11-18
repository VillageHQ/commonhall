# The tour's new steps: how they work today

Approved page: [CHARTER.md](CHARTER.md). What it does: [SPEC.md](SPEC.md). How the tour itself works and how to add a
step: `.ai/features/landing-tour/NOTES.md`.

## The eight steps (`tour/src/steps.ts`)
Search → Ask for an intro → Ask everyone → Directory → **Book a call** → **Find candidates** → **Announce** →
**Intros and calls**. The first four are landing-tour's; the last replaced its "Intros, counted".

- **Book a call** (`/directory` → `/directory?view=experts`): the pointer presses "Experts and mentors" (a press only:
  the app's switch rewrites the window's address with `history.replaceState`, so the tour moves its own address with
  `go`), points at Grace Kim (mentor), then presses Grace's "Book a call" (`tap`: a real click would open a new tab and
  record a call). Cards come from `readDirectory("", true)`: every demo person whose `DEMO_COMMUNITY_ROLES` role is an
  expert role, Grace first. Links follow the app's rule for the viewer Sam Lee: Ines Costa's link is only for people
  introduced to Ines, so that card shows none; Marcus Webb has none. Links are `cal.example.com`.
- **Find candidates** (`/jobs` → `/search/candidates?job=…&q=…&scope=network`): the jobs page with the demo's six jobs
  (`DEMO_JOB_SOURCES`); "Find candidates" shows only on Tallyhealth's (Sam Lee's company). Its link goes straight to the
  address the app's first visit redirects to (`buildCandidateQuery`: "Founding account executive in Boston"). Results
  are three made-up account executives in Boston (Grace Ito, Leo Martins, Jonas Weber: portraits no other demo person
  uses), each with an intro path through a member. The hiring-request box links the app's own draft
  (`toAskDraftHref(draftHiringAsk(job), { category: "hire" })`).
- **Announce** (`/admin/announcements`, admin shell): types the subject and the message with `{first name}`, points at
  the preview (as Maya Ortiz, the admin, as the page starts), presses Send (a `tap`: nothing is sent). The Sent list
  shows one earlier announcement.
- **Intros and calls** (`/admin`): the ledger, then the Calls requested sheet (`CONSOLE_HOME.calls`).

## Pages added to `tour/src/screens.tsx`
`/jobs` (copies `src/app/(app)/jobs/page.tsx`), `/search/candidates` (copies the candidates page; the hiring box is its
`HiringRequest`), `/admin/announcements` (copies the page and its Sent table). `seedTourData` adds the candidate search
and the experts view. `src/shell/find-candidates.ts` and `reads-announcements.ts` are server-only, so the tour uses
the pure rules (`rules-candidates.ts`, `toAskDraftHref`) and only the type of `SentAnnouncement`.

## The landing page with eight steps
- **Tabs:** from 761 px wide they wrap to a second row (`site/assets/site.css`), so every step shows; on phones they
  still scroll sideways and the active one is centred.
- **Scroll track:** `main.tsx` sets `--tour-steps` on `#demo-root`; the track is `100vh × (1 + steps × 0.6)` (5.8
  window-heights for eight; it was 4 for five).

- **Centred:** `.demo` has auto side margins, so the stage sits in the middle of the window sideways too.
- **The announcements copy** follows main's role audiences (Everyone, Founders, Mentors and experts, One cohort):
  `ANNOUNCEMENT_MEMBERS` carry each demo person's `communityRole`.

## Known limits
- The app box is `inert` (landing-tour's choice: visitors' clicks and focus stay out), so its text can't be selected.
- Scrolling gives each step 0.6 of a window height; the Announce step plays about 16 s, so a quick scroller may move on
  before the Send press.

## Checking it
`node .ai/features/landing-tour/reports/check-tour.mjs <out dir>` checks all eight, and the stage's centre both ways. Proof: `reports/`.
