# Charter: ui-polish (round 8, part 1: the benchmark and the spec)

**Approved:** the owner, 23 Nov 2026, after using store build 4 (TestFlight). His list was turned into round 8's goal and
this part's brief by the orchestrator. This page records that decision; nothing here goes beyond it.

## Direction
Make the phone app and the web app feel like the best apps people already use, screen by screen, by copying proven
patterns. This part only measures and writes the plan: a benchmark against Mobbin and a spec the builders can follow.
It changes no product code.

The owner's words, area by area:
- **Inbox:** boring and unstructured, and it has a footer (phone apps have none). Make it like Airbnb's and LinkedIn's.
- **Tab bar:** its top border touches the icons, so it needs padding. Switching tabs must feel like a smooth slide,
  not a twitch.
- **Asks:** posting should feel like LinkedIn or Facebook: one big text box and one Post button. Today the fields
  and the button don't line up.
- **People search:** the button is a different height from the search box, and the page is weak in general.
- **Today:** weak too. Go through every tab and experience, on the phone and on the web.
- **Rooms:** as close as possible to X Spaces and Clubhouse (the live list, the stage and listeners, raise hand, the
  mini player). Not a new kind of experience.

**In:** the screenshots of today's app (phone inside the app, phone browser, web), the references, the differences
between them with measurements, and the spec, split into parts that can be built side by side.
**Out:** any product code. No new features: we copy patterns, we don't invent products. Round 6 and 7 decisions stay:
5 tabs, one-tap rooms, fewer choices.

## Deciding facts
- The store app is a web view of the site. The tab bar, the headers and every tab are the site's own. Only the live room
  screen and the mini player are native (`mobile/`).
- The tab bar is 64 px high, and that height includes the iPhone's home-indicator inset (34 px). On a phone with a home
  indicator, the icons therefore start 0 px under the bar's top border. This is the owner's "touches the icons".
- Switching tabs shows an outline of the next page and then swaps in the real page in one frame. The two layouts differ,
  so the content jumps (outline rows are 65 px apart, real rows 72 or 104 px). That is the twitch.
- Store build 5 is planned after this round, so changes to the native room screen and the mini player can ship.

## Proof
`BENCHMARK.md` (references described in words, no copied images) and `SPEC.md` with its part files. The pictures stay in
the git-ignored `.ai/tmp/ui-benchmark/`, because Mobbin's images are not ours to commit.

## Journeys and tests
No code changes, so no product tests run. The pull request must pass CI (the repo's checks on `.ai/` files included).
A separate helper reviews the plan on 3 situations it was not written from before the pull request opens.
