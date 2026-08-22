import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../db/database.js';

// There's no login in this app, so "profile" is just a handful of preferences tied to this
// browser's IndexedDB -- not an account. Kept as one settings row so it round-trips as a
// single object rather than several loose keys.
export const DEFAULT_PROFILE = {
  name: '',
  targetRole: '',
  linkedinUrl: '',
  weeklyGoal: 5,
};

export function useProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await getSetting('profile', null);
      setProfile(saved ? { ...DEFAULT_PROFILE, ...saved } : DEFAULT_PROFILE);
      setLoading(false);
    })();
  }, []);

  const saveProfile = useCallback(async (patch) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      // Fire-and-forget the persist -- the UI should reflect the edit immediately, and this
      // is a simple local preferences row, not something that needs a save spinner.
      setSetting('profile', next);
      return next;
    });
  }, []);

  return { profile, saveProfile, loading };
}
