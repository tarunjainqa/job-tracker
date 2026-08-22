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
