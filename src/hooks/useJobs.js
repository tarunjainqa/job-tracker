import { useCallback, useEffect, useState } from 'react';
import * as db from '../db/database.js';
import { DEFAULT_RESUMES } from '../constants.js';

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [resumeNames, setResumeNames] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [allJobs, allResumes] = await Promise.all([db.getAllJobs(), db.getAllResumeNames()]);
    setJobs(allJobs);
    setResumeNames(allResumes.length ? allResumes : DEFAULT_RESUMES);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const existingResumes = await db.getAllResumeNames();
      if (existingResumes.length === 0) {
        await Promise.all(DEFAULT_RESUMES.map((name) => db.addResumeName(name)));
      }
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  // Another tab of this same app changed the data (BroadcastChannel never echoes back to its
  // own sender, so this only ever fires for genuinely external changes) -- pick it up here.
  useEffect(() => {
    return db.subscribeToChanges(() => {
      refresh();
    });
  }, [refresh]);

  const addJob = useCallback(
    async (jobData) => {
      const job = await db.createJob(jobData);
      await refresh();
      return job;
    },
    [refresh]
  );

  const editJob = useCallback(
    async (id, patch) => {
      const job = await db.updateJob(id, patch);
      await refresh();
      return job;
    },
    [refresh]
  );

  const moveJob = useCallback(
    async (id, status) => {
      // optimistic update for a snappy drag-and-drop feel
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status } : j)));
      await db.updateJobStatus(id, status);
      await refresh();
    },
    [refresh]
  );

  const removeJob = useCallback(
    async (id) => {
      await db.deleteJob(id);
      await refresh();
    },
    [refresh]
  );

  const importData = useCallback(
    async (data, options) => {
      const result = await db.importAllData(data, options);
      await refresh();
      return result;
    },
    [refresh]
  );

  const exportData = useCallback(async () => db.exportAllData(), []);

  const loadSampleData = useCallback(async () => {
    const result = await db.seedSampleData();
    await refresh();
    return result;
  }, [refresh]);

  return {
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
    refresh,
  };
}
