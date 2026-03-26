import { useState, useEffect } from 'react';

const STORAGE_KEY = 'app_theme';

export const THEMES = [
  { id: 'dark',   label: 'Dark',   emoji: '🌑', desc: 'Default dark mode' },
  { id: 'light',  label: 'Light',  emoji: '☀️', desc: 'Light mode' },
  { id: 'pink',   label: 'Pink',   emoji: '🩷', desc: 'Pink mode' },
  { id: 'maroon', label: 'Maroon', emoji: '🖍️', desc: 'Maroon mode' },
];

export function useTheme() {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'dark'
  );

  useEffect(() => {
    const html = document.documentElement;
    // Remove all theme classes then apply the active one
    html.classList.remove('pink-mode', 'light-mode', 'maroon-mode');
    if (theme !== 'dark') html.classList.add(`${theme}-mode`);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function setTheme(id) {
    setThemeState(id);
  }

  return { theme, setTheme };
}
