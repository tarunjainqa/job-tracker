import { useMemo } from 'react';
import { AlertTriangle, PartyPopper } from 'lucide-react';
import { COLUMNS } from '../constants.js';
import {
  computeFollowUpsNeeded,
  computeFunnel,
  computeResumeBreakdown,
  computeWeeklyApplicationCounts,
} from '../analytics.js';

// Rounds a chart's max value up to a "clean" tick (5, 10, 15, 20, 25, 30...) so the gridline
// labels read like something a person would write, not a jagged raw max like "7".
function niceMax(rawMax) {
  if (rawMax <= 5) return 5;
  return Math.ceil(rawMax / 5) * 5;
}

function weekLabel(weekStartIso) {
  return new Date(weekStartIso + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function WeeklyTrendChart({ jobs }) {
  const buckets = useMemo(() => computeWeeklyApplicationCounts(jobs, 8), [jobs]);
  const max = niceMax(Math.max(1, ...buckets.map((b) => b.count)));
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      aria-label="Applications submitted per week, last 8 weeks"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Applications per week</h3>
      <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
        {total} application{total === 1 ? '' : 's'} submitted in the last 8 weeks
      </p>
      <div className="flex h-40">
        {/* Tick labels: max / half / zero, clean numbers */}
        <div className="flex w-7 shrink-0 flex-col justify-between pb-4 text-right text-[10px] text-slate-400 dark:text-slate-600">
          <span>{Math.round(max)}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative ml-2 flex-1">
          {/* Gridlines: hairline, recessive, aligned to the same three ticks */}
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-4 flex flex-col justify-between">
            <div className="border-t border-slate-200 dark:border-slate-800" />
            <div className="border-t border-slate-200 dark:border-slate-800" />
            <div className="border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex h-full items-end justify-between gap-1.5">
            {buckets.map((b, i) => {
              const isLast = i === buckets.length - 1;
              const heightPct = Math.max(2, (b.count / max) * 100);
              return (
                <div key={b.weekStart} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-32 w-full items-end justify-center">
                    {b.count > 0 && (
                      <span className="pointer-events-none absolute -top-4 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {b.count}
                      </span>
                    )}
                    <div
                      title={`Week of ${weekLabel(b.weekStart)}: ${b.count} application${b.count === 1 ? '' : 's'}`}
                      className={`w-full max-w-[24px] rounded-t ${
                        isLast ? 'bg-sky-500 dark:bg-sky-400' : 'bg-sky-300 dark:bg-sky-700'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{weekLabel(b.weekStart)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function HorizontalBars({ title, subtitle, rows, ariaLabel }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      aria-label={ariaLabel}
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
      <div className={`space-y-2.5 ${subtitle ? '' : 'mt-4'}`}>
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400" title={row.label}>
              {row.label}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded"
                style={{
                  width: `${Math.max(3, (row.value / max) * 100)}%`,
                  backgroundColor: row.color || '#0ea5e9',
                }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-slate-600 dark:text-slate-300">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FollowUpsNeeded({ jobs, onEditJob }) {
  const items = useMemo(() => computeFollowUpsNeeded(jobs), [jobs]);
  const statusTitle = (id) => COLUMNS.find((c) => c.id === id)?.title || id;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
      aria-label="Jobs that may need a follow-up"
    >
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Needs a follow-up</h3>
      <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
        Jobs sitting in a stage longer than usual, most overdue first
      </p>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <PartyPopper size={16} />
          Nothing overdue right now -- everything active has had a recent update.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ job, days, threshold }) => (
            <li key={job.id}>
              <button
                type="button"
                onClick={() => onEditJob(job)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/30 dark:hover:bg-amber-950/50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                  <span className="truncate text-slate-700 dark:text-slate-200">
                    <strong className="font-medium">{job.company}</strong> -- {job.title}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
                  {statusTitle(job.status)} for {days}d (expected within {threshold}d)
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Dashboard({ jobs, onEditJob }) {
  const funnelRows = useMemo(() => {
    const funnel = computeFunnel(jobs);
    return COLUMNS.map((c) => ({ label: c.title, value: funnel[c.id] || 0, color: c.accent }));
  }, [jobs]);

  const resumeRows = useMemo(
    () => computeResumeBreakdown(jobs, 6).map(([label, value]) => ({ label, value, color: '#0ea5e9' })),
    [jobs]
  );

  if (!jobs.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-10 text-center text-sm text-slate-400 sm:px-6">
          There's nothing to show yet -- add a job or load sample data from the Board tab first.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1600px] space-y-4 px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <WeeklyTrendChart jobs={jobs} />
          <HorizontalBars
            title="Pipeline funnel"
            subtitle="How many jobs have ever reached each stage"
            rows={funnelRows}
            ariaLabel="Jobs that have ever reached each pipeline stage"
          />
          <HorizontalBars
            title="Resume usage"
            subtitle="Jobs tracked per resume version"
            rows={resumeRows}
            ariaLabel="Number of jobs tracked per resume version"
          />
          <FollowUpsNeeded jobs={jobs} onEditJob={onEditJob} />
        </div>
      </div>
    </div>
  );
}
