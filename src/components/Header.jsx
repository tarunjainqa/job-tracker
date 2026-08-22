import { useRef } from 'react';
import { Briefcase, Download, Moon, Plus, Search, Sun, Upload } from 'lucide-react';

export default function Header({
  search,
  onSearchChange,
  theme,
  onToggleTheme,
  onAddJob,
  onExport,
  onImportFile,
  totalJobs,
}) {
  const fileInputRef = useRef(null);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-sky-600">
            <Briefcase size={16} />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Job Tracker
            </h1>
            <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
              {totalJobs} job{totalJobs === 1 ? '' : 's'} tracked locally
            </p>
          </div>
        </div>

        <div className="relative ml-0 min-w-[180px] flex-1 sm:ml-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="job-search-input"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by company or role..."
            aria-label="Search jobs by company or role"
            className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-12 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 sm:inline-block">
            ⌘K
          </kbd>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            title="Toggle light / dark mode"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={onExport}
            title="Export all data as JSON"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download size={16} />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Import data from a JSON backup"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            onClick={() => onAddJob()}
            title="Add a new job (press n)"
            className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <Plus size={15} />
            Add job
          </button>
        </div>
      </div>
    </header>
  );
}
