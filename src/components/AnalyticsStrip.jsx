import { useMemo } from 'react';
import { computeAvgDaysBetween, computeConversionRate, computeFunnel } from '../analytics.js';

function StatTile({ label, value, hint }) {
  return (
    <div className="flex-1 min-w-[130px] rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AnalyticsStrip({ jobs }) {
  const stats = useMemo(() => {
    const funnel = computeFunnel(jobs);
    const interviewRate = computeConversionRate(funnel.interview, funnel.applied);
    const offerRate = computeConversionRate(funnel.offer, funnel.applied);
    const avgDaysToInterview = computeAvgDaysBetween(jobs, 'applied', 'interview');
    return { funnel, interviewRate, offerRate, avgDaysToInterview };
  }, [jobs]);

  if (!jobs.length) return null;

  return (
    <div
      className="mx-auto flex max-w-[1600px] flex-wrap gap-2 px-4 pb-1 pt-3 sm:px-6"
      role="region"
      aria-label="Application pipeline stats"
    >
      <StatTile label="Tracked" value={jobs.length} hint="total jobs in your board" />
      <StatTile
        label="Applied → Interview"
        value={stats.interviewRate === null ? '—' : `${stats.interviewRate}%`}
        hint={`${stats.funnel.interview} of ${stats.funnel.applied} applied`}
      />
      <StatTile
        label="Applied → Offer"
        value={stats.offerRate === null ? '—' : `${stats.offerRate}%`}
        hint={`${stats.funnel.offer} of ${stats.funnel.applied} applied`}
      />
      <StatTile
        label="Avg. days to interview"
        value={stats.avgDaysToInterview === null ? '—' : Math.round(stats.avgDaysToInterview)}
        hint={stats.avgDaysToInterview === null ? 'not enough data yet' : 'from applied to interview'}
      />
    </div>
  );
}
