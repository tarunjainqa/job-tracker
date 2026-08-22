import { useEffect, useState } from 'react';
import { CheckCircle2, UserCircle } from 'lucide-react';
import { countAppliedInLastNDays } from '../analytics.js';

function isValidUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function Profile({ profile, onSave, jobs, loading }) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [urlError, setUrlError] = useState('');

  // Keep the local draft in sync whenever the persisted profile changes underneath us --
  // e.g. loaded fresh from IndexedDB once the initial async read finishes.
  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const appliedThisWeek = countAppliedInLastNDays(jobs, 7);
  const goal = Math.max(1, Number(form.weeklyGoal) || 1);
  const goalPct = Math.min(100, Math.round((appliedThisWeek / goal) * 100));

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
    if (field === 'linkedinUrl') setUrlError('');
  }

  function handleSave(e) {
    e.preventDefault();
    if (form.linkedinUrl && !isValidUrl(form.linkedinUrl)) {
      setUrlError('That doesn’t look like a valid URL (should start with http:// or https://).');
      return;
    }
    onSave({
      name: form.name.trim(),
      targetRole: form.targetRole.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      weeklyGoal: Math.max(1, Number(form.weeklyGoal) || 5),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-[1600px] px-4 py-10 text-center text-sm text-slate-400 sm:px-6">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2">
          <UserCircle size={20} className="text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your profile</h2>
        </div>
        <p className="mb-5 -mt-3 text-xs text-slate-400 dark:text-slate-500">
          There's no account here -- this is just saved locally in this browser, same as everything else in the
          app.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Tarun Jain"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="profile-role"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Target role
            </label>
            <input
              id="profile-role"
              type="text"
              value={form.targetRole}
              onChange={(e) => update('targetRole', e.target.value)}
              placeholder="e.g. Senior SDET / QA Lead"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="profile-linkedin"
              className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              LinkedIn profile URL
            </label>
            <input
              id="profile-linkedin"
              type="text"
              inputMode="url"
              value={form.linkedinUrl}
              onChange={(e) => update('linkedinUrl', e.target.value)}
              placeholder="https://www.linkedin.com/in/..."
              aria-invalid={Boolean(urlError)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
            {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
          </div>

          <div>
            <label htmlFor="profile-goal" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Weekly application goal
            </label>
            <input
              id="profile-goal"
              type="number"
              min="1"
              value={form.weeklyGoal}
              onChange={(e) => update('weeklyGoal', e.target.value)}
              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Save
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={15} />
                Saved
              </span>
            )}
          </div>
        </form>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">This week's goal</h3>
        <p className="mb-3 text-xs text-slate-400 dark:text-slate-500">
          {appliedThisWeek} of {goal} application{goal === 1 ? '' : 's'} in the last 7 days
        </p>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full transition-all ${
              goalPct >= 100 ? 'bg-emerald-500' : 'bg-sky-500 dark:bg-sky-400'
            }`}
            style={{ width: `${goalPct}%` }}
          />
        </div>
        {goalPct >= 100 && (
          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Goal met for this week -- nice work.
          </p>
        )}
      </div>
    </div>
    </div>
  );
}
