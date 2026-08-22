// Funnel + conversion math derived from each job's statusHistory (an append-only log of
// {status, at} written every time a job's status actually changes -- see db/database.js).
// Jobs created before this feature existed have no history, so we fall back to treating
// their current status as a single-point history rather than pretending we know more than we do.

function historyOf(job) {
  if (Array.isArray(job.statusHistory) && job.statusHistory.length) return job.statusHistory;
  return [{ status: job.status, at: job.createdAt || job.dateApplied || new Date().toISOString() }];
}

// For each pipeline stage, how many jobs have ever reached it (not just currently sitting in it).
export function computeFunnel(jobs) {
  const stages = ['wishlist', 'applied', 'followup', 'interview', 'offer', 'rejected'];
  const reached = Object.fromEntries(stages.map((s) => [s, 0]));
  jobs.forEach((job) => {
    const everReached = new Set(historyOf(job).map((h) => h.status));
    everReached.add(job.status);
    stages.forEach((s) => {
      if (everReached.has(s)) reached[s] += 1;
    });
  });
  return reached;
}

// Average days between two stage transitions, only across jobs that actually made both transitions.
export function computeAvgDaysBetween(jobs, fromStatus, toStatus) {
  const diffs = [];
  jobs.forEach((job) => {
    const history = historyOf(job);
    const fromEntry = history.find((h) => h.status === fromStatus);
    const toEntry = history.find((h) => h.status === toStatus);
    if (fromEntry && toEntry) {
      const diff = (new Date(toEntry.at) - new Date(fromEntry.at)) / (1000 * 60 * 60 * 24);
      if (Number.isFinite(diff) && diff >= 0) diffs.push(diff);
    }
  });
  if (!diffs.length) return null;
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

export function computeConversionRate(numerator, denominator) {
  if (!denominator) return null;
  return Math.round((numerator / denominator) * 100);
}

// ---------- Dashboard-only analytics ----------

// How many jobs got their first "applied" transition within the last N days (rolling window,
// not a calendar week) -- used for the weekly-goal progress on the Profile page. Counts each
// job once even if it later got marked applied again after being moved back.
export function countAppliedInLastNDays(jobs, days) {
  const cutoff = Date.now() - days * 86400000;
  let count = 0;
  jobs.forEach((job) => {
    const appliedEntries = historyOf(job).filter((h) => h.status === 'applied');
    if (appliedEntries.some((h) => new Date(h.at).getTime() >= cutoff)) count += 1;
  });
  return count;
}

// Buckets "applied" transitions into weekly counts for the last `weeks` weeks, oldest first,
// for the Dashboard's applications-over-time chart. A job that was marked applied more than
// once (moved back and reapplied) contributes one point per transition, not once overall --
// this chart is about applying *activity*, not distinct jobs.
export function computeWeeklyApplicationCounts(jobs, weeks = 8) {
  const now = Date.now();
  const WEEK_MS = 7 * 86400000;
  const buckets = Array.from({ length: weeks }, (_, i) => {
    const start = now - (weeks - i) * WEEK_MS;
    const end = now - (weeks - i - 1) * WEEK_MS;
    return { start, end, count: 0 };
  });
  jobs.forEach((job) => {
    historyOf(job)
      .filter((h) => h.status === 'applied')
      .forEach((h) => {
        const t = new Date(h.at).getTime();
        const bucket = buckets.find((b) => t >= b.start && t < b.end);
        if (bucket) bucket.count += 1;
      });
  });
  return buckets.map((b) => ({
    weekStart: new Date(b.start).toISOString().slice(0, 10),
    count: b.count,
  }));
}

// How many jobs used each resume, most-used first. Jobs beyond `topN` distinct resumes are
// folded into a single "Other" row rather than letting the chart grow without bound.
export function computeResumeBreakdown(jobs, topN = 6) {
  const counts = {};
  jobs.forEach((job) => {
    const key = (job.resume || '').trim() || 'Unspecified';
    counts[key] = (counts[key] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length <= topN) return sorted;
  const head = sorted.slice(0, topN);
  const otherCount = sorted.slice(topN).reduce((sum, [, c]) => sum + c, 0);
  return [...head, ['Other', otherCount]];
}

// Jobs that have been sitting in a non-terminal status longer than that status's "should have
// heard something by now" threshold, most-overdue first. Offer/Rejected are terminal -- there's
// nothing to follow up on -- so they're excluded regardless of age.
const FOLLOW_UP_THRESHOLD_DAYS = { wishlist: 14, applied: 10, followup: 7, interview: 5 };

export function computeFollowUpsNeeded(jobs) {
  const now = Date.now();
  const items = [];
  jobs.forEach((job) => {
    const threshold = FOLLOW_UP_THRESHOLD_DAYS[job.status];
    if (!threshold) return;
    const history = historyOf(job);
    const lastChangeAt = history[history.length - 1]?.at || job.updatedAt || job.createdAt;
    const days = Math.floor((now - new Date(lastChangeAt).getTime()) / 86400000);
    if (days >= threshold) {
      items.push({ job, days, threshold, overdueBy: days - threshold });
    }
  });
  return items.sort((a, b) => b.overdueBy - a.overdueBy);
}
