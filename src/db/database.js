import { openDB } from 'idb';
import { blobToBase64, base64ToBlob } from '../utils.js';

const DB_NAME = 'job-tracker-db';
const DB_VERSION = 1;
const JOBS_STORE = 'jobs';
const RESUMES_STORE = 'resumes';
const SETTINGS_STORE = 'settings';

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(JOBS_STORE)) {
          const store = db.createObjectStore(JOBS_STORE, { keyPath: 'id' });
          store.createIndex('status', 'status');
          store.createIndex('company', 'company');
          store.createIndex('dateApplied', 'dateApplied');
        }
        if (!db.objectStoreNames.contains(RESUMES_STORE)) {
          db.createObjectStore(RESUMES_STORE, { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// ---------- Cross-tab sync ----------
// Every mutation below posts on this channel. Other tabs of the same app (BroadcastChannel
// never delivers back to its own sender) pick it up in useJobs.js and refresh their state,
// so editing in one tab doesn't leave a second open tab silently stale.
const syncChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('job-tracker-sync') : null;
function notifyChange(type) {
  syncChannel?.postMessage({ type, at: Date.now() });
}

// ---------- Jobs ----------

export async function getAllJobs() {
  const db = await getDB();
  return db.getAll(JOBS_STORE);
}

export async function createJob(jobData) {
  const db = await getDB();
  const now = new Date().toISOString();
  const status = jobData.status || 'wishlist';
  const job = {
    id: uuid(),
    company: '',
    title: '',
    linkedinUrl: '',
    resume: '',
    resumeFile: null,
    dateApplied: now.slice(0, 10),
    salaryRange: '',
    notes: '',
    status,
    statusHistory: [{ status, at: now }],
    createdAt: now,
    updatedAt: now,
    ...jobData,
  };
  await db.put(JOBS_STORE, job);
  if (job.resume) await addResumeName(job.resume);
  notifyChange('jobs');
  return job;
}

export async function updateJob(id, patch) {
  const db = await getDB();
  const existing = await db.get(JOBS_STORE, id);
  if (!existing) throw new Error('Job not found: ' + id);

  let statusHistory = Array.isArray(existing.statusHistory) ? existing.statusHistory : [];
  if (patch.status && patch.status !== existing.status) {
    statusHistory = [...statusHistory, { status: patch.status, at: new Date().toISOString() }];
  }

  const updated = { ...existing, ...patch, statusHistory, id, updatedAt: new Date().toISOString() };
  await db.put(JOBS_STORE, updated);
  if (updated.resume) await addResumeName(updated.resume);
  notifyChange('jobs');
  return updated;
}

export async function updateJobStatus(id, status) {
  return updateJob(id, { status });
}

export async function deleteJob(id) {
  const db = await getDB();
  await db.delete(JOBS_STORE, id);
  notifyChange('jobs');
}

export async function bulkPutJobs(jobs) {
  const db = await getDB();
  const tx = db.transaction(JOBS_STORE, 'readwrite');
  await Promise.all(jobs.map((j) => tx.store.put(j)));
  await tx.done;
  notifyChange('jobs');
}

export async function clearAllJobs() {
  const db = await getDB();
  await db.clear(JOBS_STORE);
  notifyChange('jobs');
}

export function subscribeToChanges(handler) {
  if (!syncChannel) return () => {};
  const listener = (event) => handler(event.data);
  syncChannel.addEventListener('message', listener);
  return () => syncChannel.removeEventListener('message', listener);
}

// ---------- Resumes ----------

export async function getAllResumeNames() {
  const db = await getDB();
  const all = await db.getAll(RESUMES_STORE);
  return all.map((r) => r.name).sort((a, b) => a.localeCompare(b));
}

export async function addResumeName(name) {
  if (!name || !name.trim()) return;
  const db = await getDB();
  await db.put(RESUMES_STORE, { name: name.trim() });
}

export async function bulkPutResumes(names) {
  const db = await getDB();
  const tx = db.transaction(RESUMES_STORE, 'readwrite');
  await Promise.all(names.map((name) => tx.store.put({ name })));
  await tx.done;
}

// ---------- Settings (theme, sort prefs, etc.) ----------

export async function getSetting(key, fallback = null) {
  const db = await getDB();
  const row = await db.get(SETTINGS_STORE, key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put(SETTINGS_STORE, { key, value });
}

// ---------- Export / Import ----------
// A resume file attached to a job is a Blob/File, which JSON.stringify can't represent --
// so on export we base64-encode it into the payload, and on import we decode it back into
// a real File. That keeps a single JSON backup fully self-contained, attachments included.

export async function exportAllData() {
  const [jobs, resumes] = await Promise.all([getAllJobs(), getAllResumeNames()]);
  const exportableJobs = await Promise.all(
    jobs.map(async (job) => {
      const { resumeFile, ...rest } = job;
      if (resumeFile instanceof Blob) {
        const resumeFileBase64 = await blobToBase64(resumeFile);
        return {
          ...rest,
          resumeFileName: resumeFile.name || rest.resumeFileName || 'resume',
          resumeFileType: resumeFile.type || 'application/octet-stream',
          resumeFileBase64,
        };
      }
      return rest;
    })
  );
  return {
    schemaVersion: DB_VERSION,
    exportedAt: new Date().toISOString(),
    jobs: exportableJobs,
    resumes,
  };
}

export async function importAllData(data, { mode = 'merge' } = {}) {
  if (!data || !Array.isArray(data.jobs)) {
    throw new Error('Invalid backup file: missing "jobs" array.');
  }
  if (mode === 'replace') {
    await clearAllJobs();
  }
  const restoredJobs = data.jobs.map((job) => {
    if (job.resumeFileBase64) {
      const { resumeFileBase64, resumeFileType, resumeFileName, ...rest } = job;
      const blob = base64ToBlob(resumeFileBase64, resumeFileType);
      const resumeFile = new File([blob], resumeFileName || 'resume', { type: resumeFileType });
      return { ...rest, resumeFile };
    }
    return job;
  });
  await bulkPutJobs(restoredJobs);
  const resumeNames = new Set(data.resumes || []);
  restoredJobs.forEach((j) => j.resume && resumeNames.add(j.resume));
  await bulkPutResumes(Array.from(resumeNames));
  return { importedJobs: restoredJobs.length };
}

// ---------- Sample data (lets a first-time viewer see a populated board instantly) ----------

export async function seedSampleData() {
  const now = Date.now();
  const daysAgo = (n) => new Date(now - n * 86400000).toISOString();
  const samples = [
    {
      company: 'Google',
      title: 'SDET II',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000001',
      resume: 'SDE_Resume_v3',
      salaryRange: '₹28-32 LPA',
      notes: 'Referred by a former teammate.',
      status: 'wishlist',
      daysBack: 2,
    },
    {
      company: 'Microsoft',
      title: 'QA Lead',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000002',
      resume: 'QA_Lead_Resume',
      salaryRange: '₹30-35 LPA',
      notes: 'Applied via careers portal.',
      status: 'applied',
      daysBack: 9,
    },
    {
      company: 'Amazon',
      title: 'Test Manager',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000003',
      resume: 'QA_Lead_Resume',
      salaryRange: '₹32-38 LPA',
      notes: 'Followed up with recruiter Priya on LinkedIn.',
      status: 'followup',
      daysBack: 14,
    },
    {
      company: 'Stripe',
      title: 'Senior SDET',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000004',
      resume: 'SDE_Resume_v3',
      salaryRange: '$150-180K',
      notes: 'Two rounds done, system design pending.',
      status: 'interview',
      daysBack: 20,
    },
    {
      company: 'Netflix',
      title: 'QA Automation Engineer',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000005',
      resume: 'SDE_Resume_v3',
      salaryRange: '$160-190K',
      notes: 'Offer received, negotiating start date.',
      status: 'offer',
      daysBack: 30,
    },
    {
      company: 'Meta',
      title: 'QA Engineer',
      linkedinUrl: 'https://www.linkedin.com/jobs/view/1000000006',
      resume: 'QA_Lead_Resume',
      salaryRange: '$140-165K',
      notes: 'Rejected after final round -- asked for feedback.',
      status: 'rejected',
      daysBack: 25,
    },
  ];

  const jobs = samples.map((s) => {
    const appliedAt = daysAgo(s.daysBack);
    const history = [{ status: 'wishlist', at: appliedAt }];
    if (s.status !== 'wishlist') history.push({ status: 'applied', at: daysAgo(Math.max(s.daysBack - 1, 0)) });
    if (['followup', 'interview', 'offer', 'rejected'].includes(s.status) && s.status !== 'applied') {
      history.push({ status: s.status, at: daysAgo(Math.max(s.daysBack - 3, 0)) });
    }
    return {
      id: uuid(),
      company: s.company,
      title: s.title,
      linkedinUrl: s.linkedinUrl,
      resume: s.resume,
      resumeFile: null,
      dateApplied: appliedAt.slice(0, 10),
      salaryRange: s.salaryRange,
      notes: s.notes,
      status: s.status,
      statusHistory: history,
      createdAt: appliedAt,
      updatedAt: appliedAt,
    };
  });

  await bulkPutJobs(jobs);
  const names = new Set(jobs.map((j) => j.resume).filter(Boolean));
  await bulkPutResumes(Array.from(names));
  return { added: jobs.length };
}
