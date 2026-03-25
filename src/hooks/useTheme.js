import { useState, useEffect } from 'react';

const STORAGE_KEY = 'app_theme';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('pink-mode', theme === 'pink');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'pink' ? 'dark' : 'pink'));

  return { theme, toggleTheme };
}
