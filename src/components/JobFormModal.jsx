import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ClipboardPaste, Paperclip, X } from 'lucide-react';
import { COLUMNS, EMPTY_JOB_FORM, MAX_RESUME_FILE_BYTES } from '../constants.js';
import { parseJobPosting } from '../parseJobText.js';

function isValidUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function JobFormModal({ open, onClose, onSave, initialJob, resumeNames, defaultStatus, existingJobs = [] }) {
  const [form, setForm] = useState(EMPTY_JOB_FORM);
  const [errors, setErrors] = useState({});
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [autoFillNote, setAutoFillNote] = useState('');
  const isEdit = Boolean(initialJob);
  const firstFieldRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (initialJob) {
      setForm({ ...EMPTY_JOB_FORM, ...initialJob });
    } else {
      setForm({ ...EMPTY_JOB_FORM, status: defaultStatus || 'wishlist' });
    }
    setErrors({});
    setDuplicateMatch(null);
    setPasteOpen(false);
    setPasteText('');
    setAutoFillNote('');
    // move focus into the modal so keyboard/screen-reader users land somewhere useful
    const t = setTimeout(() => firstFieldRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, initialJob, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    function handleKeydown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, onClose]);

  if (!open) return null;

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === 'company' || field === 'title') setDuplicateMatch(null);
  }

  function validate() {
    const errs = {};
    if (!form.company.trim()) errs.company = 'Company name is required.';
    if (!form.title.trim()) errs.title = 'Job title / role is required.';
    if (!isValidUrl(form.linkedinUrl.trim())) errs.linkedinUrl = 'Enter a valid URL (starting with http:// or https://).';
    if (!form.dateApplied) errs.dateApplied = 'Date applied is required.';
    if (form.resumeFile instanceof File && form.resumeFile.size > MAX_RESUME_FILE_BYTES) {
      errs.resumeFile = `That file is ${formatBytes(form.resumeFile.size)} -- please attach something under ${formatBytes(MAX_RESUME_FILE_BYTES)}.`;
    }
    return errs;
  }

  function handleAutoFill() {
    const parsed = parseJobPosting(pasteText);
    const filled = [];
    // Compute against the current `form` state directly (not inside the setForm updater) --
    // the updater callback only runs when React processes the state update, which is *after*
    // this function returns, so reading `filled` right after calling setForm(fn) would always
    // see it empty. Reading `form` here is safe because this runs from a plain button click,
    // not a rapid-fire event where `form` could already be stale.
    const next = { ...form };
    if (parsed.company && !form.company.trim()) {
      next.company = parsed.company;
      filled.push('company');
    }
    if (parsed.title && !form.title.trim()) {
      next.title = parsed.title;
      filled.push('job title');
    }
    if (parsed.linkedinUrl && !form.linkedinUrl.trim()) {
      next.linkedinUrl = parsed.linkedinUrl;
      filled.push('URL');
    }
    if (parsed.salaryRange && !form.salaryRange.trim()) {
      next.salaryRange = parsed.salaryRange;
      filled.push('salary range');
    }
    setForm(next);
    setAutoFillNote(
      filled.length
        ? `Filled in ${filled.join(', ')} -- double-check these before saving, this is best-effort parsing, not guaranteed.`
        : "Couldn't confidently pick anything out of that text -- try pasting more of the posting, or just fill the fields in below."
    );
  }

  function findDuplicate() {
    if (isEdit) return null;
    const company = form.company.trim().toLowerCase();
    const title = form.title.trim().toLowerCase();
    if (!company || !title) return null;
    return existingJobs.find(
      (j) => j.company.trim().toLowerCase() === company && j.title.trim().toLowerCase() === title
    );
  }

  function performSave() {
    onSave({
      ...form,
      company: form.company.trim(),
      title: form.title.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      resume: form.resume.trim(),
      salaryRange: form.salaryRange.trim(),
      notes: form.notes.trim(),
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!duplicateMatch) {
      const dup = findDuplicate();
      if (dup) {
        setDuplicateMatch(dup);
        return;
      }
    }
    performSave();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-800 animate-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-form-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h2 id="job-form-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit job' : 'Add a job'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
          <div className="flex-1 space-y-4 px-5 py-4">
            <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setPasteOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300"
                aria-expanded={pasteOpen}
              >
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardPaste size={14} />
                  Paste from a job posting to auto-fill
                </span>
                <span className="text-xs text-slate-400">{pasteOpen ? 'Hide' : 'Show'}</span>
              </button>
              {pasteOpen && (
                <div className="space-y-2 border-t border-dashed border-slate-300 px-3 py-3 dark:border-slate-600">
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    rows={4}
                    placeholder={'Paste the job title, company, link and/or the whole posting text here, e.g. copied straight off LinkedIn...'}
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      disabled={!pasteText.trim()}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      Auto-fill fields below
                    </button>
                    <span className="text-[11px] text-slate-400">Best-effort text parsing, not AI -- always double-check</span>
                  </div>
                  {autoFillNote && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">{autoFillNote}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Company name <span className="text-red-500">*</span>
              </label>
              <input
                ref={firstFieldRef}
                type="text"
                value={form.company}
                onChange={(e) => update('company', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-100 ${
                  errors.company ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
                }`}
                placeholder="e.g. Acme Corp"
              />
              {errors.company && <p className="mt-1 text-xs text-red-500">{errors.company}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Job title / role <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-100 ${
                  errors.title ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
                }`}
                placeholder="e.g. Senior SDET"
              />
              {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
            </div>

            {duplicateMatch && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <div>
                  You already have a "{duplicateMatch.title}" entry for {duplicateMatch.company} (status:{' '}
                  {duplicateMatch.status}). Adding this will create a second, separate card.
                  <button
                    type="button"
                    onClick={performSave}
                    className="ml-2 inline-block font-semibold underline hover:no-underline"
                  >
                    Add anyway
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                LinkedIn job URL
              </label>
              <input
                type="text"
                inputMode="url"
                value={form.linkedinUrl}
                onChange={(e) => update('linkedinUrl', e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-100 ${
                  errors.linkedinUrl ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
                }`}
                placeholder="https://www.linkedin.com/jobs/view/..."
              />
              {errors.linkedinUrl && <p className="mt-1 text-xs text-red-500">{errors.linkedinUrl}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Resume used
              </label>
              <input
                type="text"
                list="resume-options"
                value={form.resume}
                onChange={(e) => update('resume', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="e.g. SDE_Resume_v3, or type a new name"
              />
              <datalist id="resume-options">
                {resumeNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Attach resume file <span className="text-slate-400">(optional)</span>
              </label>
              {form.resumeFile ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900">
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate text-slate-700 dark:text-slate-200">
                    <Paperclip size={13} className="shrink-0" />
                    <span className="truncate">{form.resumeFile.name}</span>
                    {typeof form.resumeFile.size === 'number' && (
                      <span className="shrink-0 text-xs text-slate-400">({formatBytes(form.resumeFile.size)})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => update('resumeFile', null)}
                    className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => update('resumeFile', e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:text-slate-300 dark:file:bg-slate-700 dark:file:text-slate-200"
                />
              )}
              {errors.resumeFile && <p className="mt-1 text-xs text-red-500">{errors.resumeFile}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Date applied
                </label>
                <input
                  type="date"
                  value={form.dateApplied}
                  onChange={(e) => update('dateApplied', e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 dark:text-slate-100 ${
                    errors.dateApplied ? 'border-red-400' : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                {errors.dateApplied && <p className="mt-1 text-xs text-red-500">{errors.dateApplied}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Salary range <span className="text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                value={form.salaryRange}
                onChange={(e) => update('salaryRange', e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="e.g. ₹25-30 LPA or $150-180K"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Notes <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Recruiter name, referral info, interview feedback..."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {isEdit ? 'Save changes' : 'Add job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
