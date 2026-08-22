import { useCallback, useEffect, useState } from 'react';
import { getSetting, setSetting } from '../db/database.js';

export function useTheme() {
  const [theme, setThemeState] = useState('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      const saved = await getSetting('theme', prefersDark ? 'dark' : 'light');
      setThemeState(saved);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme, ready]);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      setSetting('theme', next);
      return next;
    });
  }, []);

  return { theme, toggleTheme, ready };
}
