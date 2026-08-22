export const COLUMNS = [
  {
    id: 'wishlist',
    title: 'Wishlist',
    description: "Saved jobs I haven't applied to yet",
    accent: '#8b5cf6',
  },
  {
    id: 'applied',
    title: 'Applied',
    description: 'Application submitted',
    accent: '#3b82f6',
  },
  {
    id: 'followup',
    title: 'Follow-up',
    description: 'Followed up with recruiter / referral',
    accent: '#eab308',
  },
  {
    id: 'interview',
    title: 'Interview',
    description: 'Currently in interview rounds',
    accent: '#f97316',
  },
  {
    id: 'offer',
    title: 'Offer',
    description: 'Received an offer',
    accent: '#22c55e',
  },
  {
    id: 'rejected',
    title: 'Rejected',
    description: 'Got a rejection',
    accent: '#ef4444',
  },
];

export const DEFAULT_RESUMES = ['SDE_Resume_v3', 'QA_Lead_Resume'];

export const EMPTY_JOB_FORM = {
  company: '',
  title: '',
  linkedinUrl: '',
  resume: '',
  resumeFile: null,
  dateApplied: new Date().toISOString().slice(0, 10),
  salaryRange: '',
  notes: '',
  status: 'wishlist',
};

export const MAX_RESUME_FILE_BYTES = 8 * 1024 * 1024; // 8MB
