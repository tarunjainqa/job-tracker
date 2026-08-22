# Build Log

This project was built in an AI-assisted session (Claude, via Cowork), end to end: scaffolding, all
feature code, and testing. This log exists because "I used AI to build this" is a weak claim on its
own -- what actually matters is what got checked, what the AI got wrong or had to be corrected on, and
which decisions were made deliberately rather than accepted by default. That's the same standard this
workspace already holds AI-generated QA output to; it seemed dishonest not to hold this project to it
too.

## Initial build decisions

**Tailwind v3, not v4.** `npm install tailwindcss` currently pulls v4, which moved to a CSS-first
config (`@import "tailwindcss"`, no `tailwind.config.js`, class-based dark mode needs a
`@custom-variant` declaration). That's a real workflow change, not just a version bump, and it adds
setup risk for a reviewer who tries to extend this later expecting the classic `tailwind.config.js` +
`darkMode: 'class'` pattern most tutorials and Stack Overflow answers still assume. Pinned to
`tailwindcss@3` deliberately, documented here so it doesn't look like an oversight.

**`@dnd-kit/core` primitives (`useDraggable`/`useDroppable`) directly, not the `sortable` preset.**
The board has six independent drop zones, not one reorderable list, so the sortable preset's array-index
model didn't fit. Plain draggable/droppable plus a `DragOverlay` for the drag preview was simpler and
is what's actually in `Board.jsx`/`Column.jsx`.

**IndexedDB via `idb`, one job store + a resumes store + a settings store.** No separate store for
resume file attachments -- the file is just a field on the job record (`resumeFile: File | null`).
IndexedDB's structured-clone algorithm handles `File`/`Blob` natively, so this didn't need a
dedicated blob store; it would only be worth splitting out if attachments needed to be shared across
multiple job records, which they don't.

## Bug caught during verification, not before

The first render of `JobCard` showed a fixed rupee icon (`<IndianRupee />`) next to every salary
badge, including ones typed in USD (`$150-180K`). That's wrong on a resume-tracking app aimed at
users applying to both Indian and international roles -- the spec's own example salary strings mix
₹ and $. Caught this by actually looking at the Playwright screenshot rather than trusting the code
read-through, and removed the icon rather than trying to detect currency from the string (a
guess-the-currency heuristic would just move the bug somewhere less visible).

## Second bug caught during verification: dead custom-error code

The LinkedIn URL field was `<input type="url">`, and the custom validator (`isValidUrl` in
`JobFormModal.jsx`) had its own styled red-text error message for a malformed URL. Testing an actual
bad value ("not-a-url") through a real form submission showed the browser's *native* `type="url"`
constraint validation firing first -- a native tooltip ("Please enter a URL"), submission silently
blocked before React's `onSubmit` handler ever ran. The custom error message was unreachable dead code
for the exact case it was meant to handle, and the UX was inconsistent (native browser bubble instead
of the app's own styling). This is the kind of bug a code read-through doesn't surface -- it only shows
up when you actually submit the form and watch what happens. Fixed by changing the field to
`type="text"` with `inputMode="url"` (keeps the mobile URL keyboard, drops the native validation
intercept) so the app's own validation is the only thing that runs.

## What "tested" means here, concretely

Every feature below was checked by driving a real headless Chromium instance against the built app
(Playwright), not by reading the code and assuming it works. Specific checks run:

- Add/edit/delete a job, with the missing-required-field validation actually triggering and blocking
  submission.
- Reload the page and confirm the data survives -- this is the one that actually proves IndexedDB
  persistence works, as opposed to just holding state in memory.
- Drag a card between columns and confirm the status change persists after the drag.
- Search/filter narrows the visible cards and un-filtering restores them.
- Export produces a downloadable JSON file with the expected shape; import round-trips it back in,
  including into a completely fresh browser context (proving it isn't just reading stale in-memory
  state).
- Two browser tabs open simultaneously: a job added in tab A appears in tab B without a reload
  (`BroadcastChannel` cross-tab sync), and a status change made through the keyboard-accessible
  "move to" `<select>` in tab B is reflected back in tab A.
- A resume file attached in the form opens correctly from the card (a real `blob:` URL, opened in a
  new tab) -- and survives an export/import round-trip, because the export step base64-encodes the
  attached file into the JSON and the import step decodes it back into a real `File`.
- Keyboard shortcuts: `Cmd/Ctrl+K` actually moves focus to the search input; `n` opens the add-job
  modal (guarded so it doesn't fire while you're typing in a field); `Escape` closes the modal and the
  delete-confirmation dialog.
- Modal accessibility: focus lands on the first field when the modal opens; the dialog exposes
  `role="dialog"` / `aria-modal="true"` for screen readers.

None of this is exhaustive (there's no automated regression suite committed to the repo -- these were
one-off verification scripts run during the build, not saved as `npm test`), so treat it as "checked
once, deliberately, with evidence" rather than "guaranteed forever." A follow-up worth doing: turn the
ad hoc Playwright scripts used during this session into a committed `tests/` suite.

## A gap in the original spec, fixed rather than left

"Days since applied" doesn't make sense for a Wishlist card -- you haven't applied yet. Left as-is,
every card in Wishlist would misleadingly say "Applied 3 days ago" for a job you only saved. Relabeled
per-status: Wishlist cards say "Saved X days ago," everything else says "Applied X days ago"
(`formatStatusDate` in `utils.js`). Small, but it's the difference between having read the spec
literally versus having thought about what a user actually sees.

## Deliberately chosen accessibility approach

`@dnd-kit`'s `KeyboardSensor` is built around the `sortable` preset's single-list model (arrow keys
move an item's index within one array). Wiring it to work across six *independent* droppable
containers, which is what this board actually has, isn't something the library supports out of the
box, and forcing it would have meant shipping a keyboard interaction that mostly works, which is worse
than being honest about the gap. Instead, every card got a genuinely keyboard- and
screen-reader-operable "move to" `<select>` that calls the exact same `onMove` handler the drag
gesture uses. It's a different interaction than simulated dragging, but it's a real, fully-tested path
to the same outcome for anyone who can't or doesn't want to use a mouse -- which is arguably a more
honest solution than a half-working keyboard-drag simulation would have been.

## Funnel analytics: what it actually measures

The "Applied → Interview" and "Applied → Offer" conversion rates and the "avg. days to interview"
stat are computed from `statusHistory`, an append-only log of `{status, at}` written every time a
job's status genuinely changes (see `updateJob` in `db/database.js`) -- not from `updatedAt`, which
changes on any edit and would have made the numbers meaningless. Jobs added before this field existed
fall back to treating their current status as a single-point history, so the stats degrade gracefully
rather than crashing on old data, but they also won't have accurate historical stage-transition timing
until they're moved again.

## "Paste to auto-fill" feature, added after initial delivery

The user asked, after seeing the deployed app populated only with sample data: is there any way to
pull or add real data automatically, short of standing up a backend and a scraping/AI pipeline? The
option chosen was a permanent in-app helper: paste a block of text from a job posting (LinkedIn's own
copy-paste layout, a plain-text "Title at Company" description, or a labeled listing with "Job Title:",
"Company:", "Salary:" lines) and have it best-effort pre-fill the Company, Title, URL, and Salary range
fields, leaving everything editable and never auto-submitting. This is plain regex/heuristics
(`src/parseJobText.js`), not an AI call -- there's no backend in this app to send text to, and it's
meant to keep working fully offline.

Three real bugs were caught during testing here, all via the same Playwright-driven verification habit
used throughout this build -- reading the code did not surface any of them:

1. **Greedy company capture.** For "...at Netflix to join our streaming platform team.", the "Title at
   Company" regex captured `"Netflix to join our streaming platform team."` as the company instead of
   just `"Netflix"` -- the capture group had no stopping point short of the next comma/period. Fixed
   with a non-greedy capture plus a lookahead that stops at common connector words ("to", "in", "for",
   "as", "which", "that", "and") as well as punctuation or end of string.
2. **Salary regex missed a "K" before the range separator.** `"Salary: $190K-$220K"` produced an empty
   match because the pattern required the separator (`-`/`–`/`to`) to immediately follow the digits.
   Fixed by allowing an optional `[Kk]` between the first number and the separator.
3. **Stale-closure bug in the confirmation message (caught via screenshot, not the parser test).** The
   parser-only test (`node` script calling `parseJobPosting` and driving the form) showed the right
   fields getting filled, but a manual screenshot of the actual modal showed the confirmation note
   underneath saying *"Couldn't confidently pick anything out of that text"* even when all four fields
   had just been filled in correctly. Cause: `handleAutoFill` built the list of newly-filled field names
   inside the `setForm(f => ...)` updater callback, then read that list immediately after calling
   `setForm` to build the message -- but React doesn't invoke a function-form `setState` updater
   synchronously; it runs later, during the state-update pass. The message was being composed from an
   array that was still empty at the point it was read. This is exactly the kind of bug that only shows
   up when you look at the actual rendered screen, not when you read the code or test the parser
   function in isolation -- the parser was correct the whole time, only the message was wrong. Fixed by
   computing the diff against the current `form` state directly (a plain object read, not a functional
   updater) before calling `setForm`, so the "filled in company, job title, ..." message is built from
   the same synchronous pass that decides what to fill.

## Dashboard and Profile pages, added after initial delivery

The user asked to add a Dashboard and a Profile page. Before building either, I asked what
"dashboard" and "profile" should actually mean here, since the app had no navigation and no
concept of a profile at all -- guessing would have meant a real risk of building the wrong thing
and redoing it. The answers: the Dashboard should go deeper than the existing analytics strip
(real charts, not just four stat tiles) plus a follow-ups worklist; the Profile should hold
personal/job-search info (name, target role, LinkedIn, a weekly application goal), not become a
full settings page; navigation should be simple top tabs next to the logo.

**Navigation.** Added a `view` state in `App.jsx` ('board' | 'dashboard' | 'profile') and three
tabs in the header. The search box is now hidden outside the Board view -- leaving it visible but
inert on Dashboard/Profile would have looked like a bug (why doesn't typing here do anything?).
Board's own scroll handling (each column scrolls independently, the whole board scrolls
horizontally) is unusual enough that I checked it directly rather than assuming a generic
`overflow-y-auto` on `<main>` would be harmless -- it would have fought with Board's existing
layout, so Dashboard and Profile each scroll internally instead, matching the pattern Board
already used rather than introducing a second one.

**Dashboard charts.** Before writing any chart code I read through this workspace's data
visualization skill rather than eyeballing colors -- its main rules: pick the chart form before
color, one axis only, color follows the entity not an arbitrary series index, direct labels over
relying on hover alone, and dark mode is a real validated pass, not an automatic invert. In
practice: the pipeline funnel and per-stage colors reuse the exact same accent colors as the
Kanban columns (color already means something in this app -- introducing a second, different blue
for "Applied" on the Dashboard than the one on the board itself would have been confusing, not
just inconsistent). The weekly-applications trend and resume-usage charts are single series, so
they use one hue and skip a legend (a legend box restating "applications" for one blue bar family
would cost space and say nothing a title doesn't already say). All charts are plain HTML/CSS bars,
not a charting library -- nothing here needed one, and it keeps the bundle small. Charts were
checked in both light and dark mode and at tablet width via Playwright screenshots, not just
assumed to work from the code.

**Follow-ups worklist.** "Needs a follow-up" flags any non-terminal job (Wishlist/Applied/
Follow-up/Interview) that's been sitting without a status change longer than a stage-appropriate
threshold (14/10/7/5 days respectively) -- Offer and Rejected are terminal, so they're excluded
regardless of age. Clicking an item opens that job directly in the edit modal, tested end-to-end
via Playwright (not just that the list renders, but that the click actually opens the right job).

**Profile.** No login exists anywhere in this app by design, so "profile" is explicitly local
preferences tied to this browser, not an account -- the page says so directly rather than implying
otherwise. The weekly-goal progress is computed from the same `statusHistory` the funnel analytics
already use (jobs that got an "applied" transition in the last 7 rolling days), so it's a real
number, not a guess. The LinkedIn URL field uses `type="text" inputMode="url"` rather than
`type="url"` -- the same fix applied earlier to the job form's own LinkedIn field, for the same
reason (native `type="url"` validation silently intercepts the browser's own form submission
before the app's own error message can run). Getting that right the second time, deliberately,
rather than reintroducing the same bug, is the actual point of writing this log.

Tested via a dedicated Playwright script covering: both nav tabs render and route correctly, the
search box disappears outside Board, all four Dashboard sections render with real data, clicking a
follow-up item opens the correct job for editing, the Profile form saves and -- reloading the page
to prove it -- actually persisted to IndexedDB rather than just React state, and an invalid
LinkedIn URL is rejected with a visible error instead of failing silently.

## Known limitations, stated rather than hidden

- No automated test suite is committed -- verification was done with one-off Playwright scripts during
  the build (see above), not a repeatable `npm test`.
- Resume file attachments are capped at 8MB and stored inline in IndexedDB; there's no size-based
  warning about total database size if someone attaches many large files.
- The funnel analytics' historical accuracy is only as good as `statusHistory`, which only starts
  recording from this version onward.
- The paste-to-auto-fill parser is heuristic, not AI -- it will miss or misparse postings in formats
  it doesn't recognize. It's designed to only ever fill blank fields (never overwrite something you
  typed) and always leaves the result editable, but it's still worth a manual glance before saving.
- The Dashboard's follow-up thresholds (14/10/7/5 days per stage) are fixed constants, not
  configurable per user -- reasonable defaults, not a claim that they fit every job search or
  industry.
- "Profile" is local preferences, not an account -- clearing this browser's site data erases it the
  same way it erases jobs, and it doesn't sync to any other device or browser.
