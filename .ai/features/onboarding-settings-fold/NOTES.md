# How the Advanced fold works today

- **The part:** `src/components/advanced-section.tsx` (`AdvancedSection`), a `<details id="advanced" class="fh-advanced">`
  that is closed on load, with "Advanced" and one line naming what is inside. Styles in `src/app/parts.css`
  (`details.fh-advanced`). It spans the whole grid row (`fh-c12`) and holds its own `fh-grid`.
- **Opens by itself** when the address ends in `#<id>` of an element inside it (`/admin/settings#mail`, `#hosting`,
  `#plan`, `#look`, `#advanced`), on load and on a hash change, then scrolls there; and when its `openWhen` prop
  changes to a new truthy value (Settings passes the save errors when one is on a folded field).
- **Settings** (`settings-form.tsx`): in view the name, logo file, brand colour, preview and Save. Under Advanced:
  "More about your look" (Logo URL, short descriptor), Mail (from name, sending domain), Hosting & data, Plan, a second
  Save, and the page's old right column (mail checklist, Village line, audit log, version). It is still one form and
  one save; a failed save focuses the first field marked invalid (`ADVANCED_FIELDS` lists the folded ones).
- **Mail** (`src/app/(app)/admin/mail/page.tsx`): in view one status line (`MailStatus`: "✓ Handled by Village —
  invites send from …" on the managed plan, else "Mail service: connected / not set, sending from …") with
  `SendTestButton` (now its own part in `mail-forms.tsx`), and the DNS checklist with "Check DNS now" (the owner's
  pick). Under Advanced: DNS settings, Last 30 days, do-not-send list, sending log, "Running it yourself", and the
  reply-domain line that used to be the lede.
- **Village** (`src/app/(app)/admin/village/page.tsx`): in view the Connection part (owned by onboarding-village-connect,
  untouched here, including the "Running it yourself" box above it when there is no key) and the two meters. Under
  Advanced: Limits and switches, Profile fill-in, What Village sees, What this costs.
- Each page's lede says what the page does for the organizer in one line.
