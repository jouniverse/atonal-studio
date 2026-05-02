'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/state/useThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const saved = localStorage.getItem('atonal-theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    localStorage.setItem('atonal-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
