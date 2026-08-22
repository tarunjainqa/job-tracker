import { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Header from './components/Header.jsx';
import Board from './components/Board.jsx';
import Dashboard from './components/Dashboard.jsx';
import Profile from './components/Profile.jsx';
import JobFormModal from './components/JobFormModal.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import AnalyticsStrip from './components/AnalyticsStrip.jsx';
import { useJobs } from './hooks/useJobs.js';
import { useTheme } from './hooks/useTheme.js';
import { useProfile } from './hooks/useProfile.js';
import { downloadJson } from './utils.js';

export default function App() {
  const {
    jobs,
    resumeNames,
    loading,
    addJob,
    editJob,
    moveJob,
    removeJob,
    importData,
    exportData,
    loadSampleData,
  } = useJobs();
  const { theme, toggleTheme } = useTheme();
  const { profile, saveProfile, loading: profileLoading } = useProfile();

  const [view, setView] = useState('board');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('wishlist');
  const [jobPendingDelete, setJobPendingDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter(
      (j) => j.company.toLowerCase().includes(q) || j.title.toLowerCase().includes(q)
    );
  }, [jobs, search]);

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }

  function openAddModal(status) {
    setEditingJob(null);
    setDefaultStatus(status || 'wishlist');
    setModalOpen(true);
  }

  function openEditModal(job) {
    setEditingJob(job);
    setModalOpen(true);
  }

  async function handleSave(formData) {
    if (editingJob) {
      await editJob(editingJob.id, formData);
      showToast('Job updated.');
    } else {
      await addJob(formData);
      showToast('Job added.');
    }
    setModalOpen(false);
    setEditingJob(null);
  }

  async function handleConfirmDelete() {
    if (!jobPendingDelete) return;
    await removeJob(jobPendingDelete.id);
    setJobPendingDelete(null);
    showToast('Job deleted.');
  }

  async function handleExport() {
    const data = await exportData();
    const stamp = new Date().toISOString().slice(0, 10);
    downloadJson(`job-tracker-backup-${stamp}.json`, data);
    showToast('Exported backup JSON.');
  }

  async function handleImportFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await importData(data, { mode: 'merge' });
      showToast(`Imported ${result.importedJobs} job(s).`);
    } catch (err) {
      showToast('Import failed: ' + err.message);
    }
  }

  async function handleLoadSampleData() {
    const result = await loadSampleData();
    showToast(`Loaded ${result.added} sample jobs.`);
  }

  // Keyboard shortcuts: Cmd/Ctrl+K focuses search, "n" opens the add-job modal (unless
  // the user is already typing somewhere, or a modal is already open).
  useEffect(() => {
    function handleKeydown(e) {
      const active = document.activeElement;
      const isTyping =
        active &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('job-search-input')?.focus();
      } else if (!isTyping && !modalOpen && !jobPendingDelete && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openAddModal('wishlist');
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [modalOpen, jobPendingDelete]);

  return (
    <div className="flex h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <Header
        search={search}
        onSearchChange={setSearch}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAddJob={() => openAddModal('wishlist')}
        onExport={handleExport}
        onImportFile={handleImportFile}
        totalJobs={jobs.length}
        activeView={view}
        onChangeView={setView}
      />

      {!loading && view === 'board' && <AnalyticsStrip jobs={jobs} />}

      {!loading && view === 'board' && jobs.length === 0 && (
        <div className="mx-auto mt-2 flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            <Sparkles size={15} className="text-slate-400" />
            Your board is empty.
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="font-medium text-sky-600 hover:underline dark:text-sky-400"
            >
              Load sample data
            </button>
            to see how it looks, or click "Add job" to start tracking for real.
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading your jobs...
          </div>
        ) : view === 'board' ? (
          <Board jobs={filteredJobs} onEdit={openEditModal} onDelete={setJobPendingDelete} onMove={moveJob} />
        ) : view === 'dashboard' ? (
          <Dashboard jobs={jobs} onEditJob={openEditModal} />
        ) : (
          <Profile profile={profile} onSave={saveProfile} jobs={jobs} loading={profileLoading} />
        )}
      </main>

      <JobFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSave}
        initialJob={editingJob}
        resumeNames={resumeNames}
        defaultStatus={defaultStatus}
        existingJobs={jobs}
      />

      <ConfirmDialog
        open={Boolean(jobPendingDelete)}
        title="Delete this job?"
        message={
          jobPendingDelete
            ? `This will permanently remove "${jobPendingDelete.title}" at ${jobPendingDelete.company} from your tracker.`
            : ''
        }
        onConfirm={handleConfirmDelete}
        onCancel={() => setJobPendingDelete(null)}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-700"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
