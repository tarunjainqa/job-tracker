# Job Tracker

A local-first job application tracker: a Kanban board with drag-and-drop, built with React + Vite + Tailwind CSS. All data is stored in your browser's IndexedDB — there's no backend, no account, and nothing ever leaves your machine.

See `BUILD_LOG.md` for how this was built (an AI-assisted session), the decisions made along the way, a bug caught during testing, and exactly what was verified and how.

## Features

- Six-column Kanban board: Wishlist → Applied → Follow-up → Interview → Offer → Rejected
- Drag and drop cards between columns (`@dnd-kit`), plus a keyboard- and screen-reader-accessible "move to" control on every card as a non-drag alternative
- Add / edit jobs via a slide-over form, with required-field validation and a duplicate-entry warning (same company + role)
- **Paste from a job posting to auto-fill**: paste text copied from a LinkedIn posting, a plain-text job description, or a labeled listing, and it best-effort pre-fills Company / Title / URL / Salary range (never overwrites a field you've already typed, always leaves the result editable). Plain regex parsing, no AI call, works fully offline.
- Delete with a confirmation dialog
- Each card shows company, role, resume tag, salary range, an attached resume file (optional), days since applied — worded as "Saved" for Wishlist and "Applied" everywhere else — and a clickable LinkedIn link
- Attach the actual resume file (PDF/doc/docx, up to 8MB) to a job, stored in IndexedDB and viewable from the card; it round-trips through Export/Import too
- Column headers show live counts
- Search/filter by company or role
- Sort cards within a column (newest/oldest) via the icon in each column header
- An analytics strip: total tracked, Applied→Interview and Applied→Offer conversion rates, and average days from Applied to Interview — computed from a real per-job status-change history, not guessed
- "Load sample data" on an empty board, so there's something to look at without manual data entry
- Light/dark mode toggle (persisted)
- Export all data (including attached resume files) to a JSON backup file, and import it back in (merges with existing data)
- Cross-tab sync: edits in one open tab show up in another without a reload
- A **Dashboard** tab: applications-per-week trend, a pipeline funnel chart, a resume-usage breakdown, and a "needs a follow-up" worklist that flags jobs sitting in a stage longer than expected (clicking one opens it for editing)
- A **Profile** tab: name, target role, LinkedIn URL, and a weekly application goal with progress -- local preferences, not an account (there's no login anywhere in this app)
- Keyboard shortcuts: `Cmd/Ctrl+K` to jump to search, `n` to add a job, `Escape` to close any dialog
- Responsive layout for laptop and tablet (columns scroll horizontally, each column scrolls independently)

## Getting started

Requires [Node.js](https://nodejs.org/) 18+ installed on your machine.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`) in your browser.

To build a static production bundle:

```bash
npm run build
npm run preview   # serve the built app locally to check it
```

## Data & storage

All jobs, resume names, attached resume files, and your theme preference are stored in an IndexedDB database named `job-tracker-db`, scoped to whichever browser + origin you run the app on. That means:

- Data persists across restarts of the dev server and across browser restarts.
- Data is per-browser — it won't follow you to a different browser or a different machine unless you use Export/Import.
- Clearing your browser's site data for `localhost` (or whatever origin you deploy to) will erase it. Use the Export button regularly if you want a backup — attached resume files are included in the export.

## Project structure

```
src/
  db/database.js       IndexedDB wrapper (idb) — all CRUD, status-history tracking, cross-tab
                        BroadcastChannel notifications, sample-data seeding, and base64
                        export/import of attached resume files
  analytics.js          Funnel + conversion-rate math derived from statusHistory
  hooks/useJobs.js      React hook exposing jobs + CRUD actions backed by the DB
  hooks/useTheme.js     Light/dark theme state, persisted to IndexedDB
  constants.js          Kanban column definitions, default resume names, form defaults
  utils.js              Date formatting/labeling, JSON export, blob<->base64 helpers
  parseJobText.js       Best-effort regex parsing for the "paste to auto-fill" feature
  hooks/useProfile.js   Local profile/preferences state, persisted to IndexedDB settings
  components/
    Board.jsx            DndContext + column layout
    Column.jsx            One Kanban column (droppable, sortable, scrollable)
    JobCard.jsx            One job card (draggable + keyboard-accessible move control)
    JobFormModal.jsx        Add/edit slide-over form: validation, duplicate warning, file attach, paste-to-auto-fill
    Dashboard.jsx            Applications-per-week chart, pipeline funnel, resume usage, follow-ups worklist
    Profile.jsx              Name / target role / LinkedIn / weekly goal, with goal progress
    ConfirmDialog.jsx        Generic delete confirmation
    Header.jsx                Search bar, theme toggle, export/import, add button
    AnalyticsStrip.jsx        Pipeline stats strip
```
