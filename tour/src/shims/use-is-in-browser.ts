// The tour's stand-in for `src/components/use-is-in-browser.ts`: the tour's answers are in memory from the start, so
// its screens render them at once, also in the still the build writes into the page.
export function useIsInBrowser() {
  return true;
}
