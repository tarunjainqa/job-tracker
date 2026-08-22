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

## Known limitations, stated rather than hidden

- No automated test suite is committed -- verification was done with one-off Playwright scripts during
  the build (see above), not a repeatable `npm test`.
- Resume file attachments are capped at 8MB and stored inline in IndexedDB; there's no size-based
  warning about total database size if someone attaches many large files.
- The funnel analytics' historical accuracy is only as good as `statusHistory`, which only starts
  recording from this version onward.
