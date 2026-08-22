import { useDraggable } from '@dnd-kit/core';
import { ExternalLink, Paperclip, Pencil, Trash2 } from 'lucide-react';
import { formatStatusDate, openBlobInNewTab } from '../utils.js';
import { COLUMNS } from '../constants.js';

export default function JobCard({ job, accent, onEdit, onDelete, onMove, dragDisabled }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job.id,
    disabled: dragDisabled,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeftColor: accent }}
      className={`group relative rounded-lg border border-slate-200 bg-white p-3 shadow-sm border-l-4 dark:border-slate-700 dark:bg-slate-800
        ${isDragging ? 'opacity-40' : 'opacity-100'}
        hover:shadow-md focus-within:ring-2 focus-within:ring-sky-400 transition-shadow cursor-grab active:cursor-grabbing`}
      role="group"
      aria-roledescription="draggable job card"
      aria-label={`${job.company}, ${job.title}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900 dark:text-slate-100">{job.company}</p>
          <p className="truncate text-sm text-slate-600 dark:text-slate-300">{job.title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            aria-label="Edit job"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(job);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            aria-label="Delete job"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(job);
            }}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {job.resume && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {job.resume}
          </span>
        )}
        {job.salaryRange && (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            {job.salaryRange}
          </span>
        )}
        {job.resumeFile && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              openBlobInNewTab(job.resumeFile);
            }}
            title={job.resumeFile.name || 'Attached resume file'}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
          >
            <Paperclip size={10} />
            Resume file
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{formatStatusDate(job.dateApplied, job.status)}</span>
        {job.linkedinUrl ? (
          <a
            href={job.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            aria-label="Open LinkedIn job posting"
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-900/30"
          >
            <ExternalLink size={13} />
            LinkedIn
          </a>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">No link</span>
        )}
      </div>

      {job.notes && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400" title={job.notes}>
          {job.notes}
        </p>
      )}

      {onMove && (
        <div className="mt-2 border-t border-slate-100 pt-2 dark:border-slate-700">
          <label className="sr-only" htmlFor={`move-${job.id}`}>
            Move {job.company} {job.title} to a different status
          </label>
          <select
            id={`move-${job.id}`}
            value={job.status}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.value !== job.status) onMove(job.id, e.target.value);
            }}
            className="w-full rounded border-none bg-transparent text-[11px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-400 dark:text-slate-500"
            aria-label="Move to status (keyboard-accessible alternative to drag-and-drop)"
          >
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === job.status ? `Currently: ${c.title}` : `Move to: ${c.title}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
