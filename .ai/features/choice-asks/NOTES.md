# How asks and intros in one tap work today

- **Matching** (`src/modules/asks/service-helpers.ts`, `readAskWordHelpers`): two reads of `readWordHelpers`, the ask's
  title and detail, then the title, detail, target and company together (`readAskMatchText` in `rules-help-match.ts`).
  The first list keeps its places; the second only fills up to `ASK_LIMITS.wordHelpersPerAsk`. Today's "why you"
  words (`reads-could-help.ts`) read the same combined text.
- **Composer** (`components/asks-composer.tsx`): a one-row `Textarea` that grows with its text (`fitToText`); the
  extras appear on the first typed letter and stay until a post succeeds. "Post a win instead" submits the same form
  as `kind: update`. One post at a time (`isPending`); the server's allowance lock stops a second.
- **The connector's answer** (`intros/components/intro-page-actions.tsx`, `ConnectorAnswer`): two buttons posting
  `choice: yes | not_now` with no address, no note edit and no private reason. The returned `consentIssue` goes into
  the `issuedConsentQuery` cache, so `consent-link-panel.tsx` shows the link right after the redraw (the server keeps
  only a hash). A failed answer (answered in another tab) refreshes the page. `.fh-note-first` puts the note first.
- **The server** (`intros/service-answers.ts`): `answerAsConnector(..., { fromLink })`. In the app a yes needs no
  address and uses only a typed one; from the connector's email link (`answerByLink`) the address is still needed,
  the asker's if they gave one, because that page has no link to copy.
- **Help** (`asks/service-status.ts`, `helpWithAsk`): the `ask_answer` row always holds the fixed line; the typed note
  lives in `ask_offer.note`. `reads-board.ts` `attachPrivateNotes` adds `privateNote` to help lines for the asker
  (every helper's) and the helper (their own) only. Today's buttons are `HelpAskButtons` in `src/shell/today-actions.tsx`
  (`knownPerson` on the Today ask picks Knows someone vs Can help).
- **Not for me** (`ask_skip`): `isForViewer` in `reads-board.ts` leaves skipped asks out of For you and its count;
  `components/skip-ask-button.tsx` is the For you card button.
- **Drafted note** (`src/shell/intro-ask-note.ts`, `draftIntroNote`): asker's name, role, company and the first
  sentence of their bio, then "Could you introduce me to <name> (<about>)?". `needs` is no longer read.

Known, left for later: an answered intro shows its status pill twice (older); a second tab can still turn an
earlier yes into a no with one tap (the decline move is allowed from asking the person, as before); a win counts
toward the open-posts limit (older).
