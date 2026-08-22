import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';
import JobCard from './JobCard.jsx';

export default function Column({ column, jobs, onEdit, onDelete, onMove }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [sortDir, setSortDir] = useState('newest');

  const sortedJobs = useMemo(() => {
    const copy = [...jobs];
    copy.sort((a, b) => {
      const da = new Date(a.dateApplied || a.createdAt).getTime();
      const db_ = new Date(b.dateApplied || b.createdAt).getTime();
      return sortDir === 'newest' ? db_ - da : da - db_;
    });
    return copy;
  }, [jobs, sortDir]);

  return (
    <div
      className="flex h-full w-72 shrink-0 flex-col rounded-xl bg-slate-50 dark:bg-slate-900/60"
      role="region"
      aria-label={`${column.title} column, ${jobs.length} job${jobs.length === 1 ? '' : 's'}`}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl border-b border-slate-200 px-3 py-2.5 dark:border-slate-800"
        style={{ borderTop: `3px solid ${column.accent}` }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              {column.title}
            </h2>
            <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {jobs.length}
            </span>
          </div>
          <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{column.description}</p>
        </div>
        <button
          type="button"
          onClick={() => setSortDir((d) => (d === 'newest' ? 'oldest' : 'newest'))}
          title={sortDir === 'newest' ? 'Sorted newest first' : 'Sorted oldest first'}
          aria-label={sortDir === 'newest' ? 'Sorted newest first, click to sort oldest first' : 'Sorted oldest first, click to sort newest first'}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          {sortDir === 'newest' ? <ArrowDownNarrowWide size={15} /> : <ArrowUpNarrowWide size={15} />}
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 overflow-y-auto p-2.5 transition-colors ${
          isOver ? 'bg-slate-100 dark:bg-slate-800/60' : ''
        }`}
        style={{ minHeight: 120 }}
      >
        {sortedJobs.length === 0 && (
          <p className="mt-6 text-center text-xs text-slate-300 dark:text-slate-600">Drop a card here</p>
        )}
        {sortedJobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            accent={column.accent}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            dragDisabled={false}
          />
        ))}
      </div>
    </div>
  );
}
