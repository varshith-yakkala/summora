'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ink_signal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ink_signal_theme', 'light');
    }
  };

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="w-9 h-9 rounded-sm flex items-center justify-center border border-border text-text-muted hover:text-text hover:bg-surface-sunken transition-colors"
      >
        <div className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="w-9 h-9 rounded-sm flex items-center justify-center border border-border text-text-muted hover:text-text hover:bg-surface-sunken transition-colors focus-visible:outline-2 focus-visible:outline-accent"
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-text-muted hover:text-text" />
      ) : (
        <Moon className="w-4 h-4 text-text-muted hover:text-text" />
      )}
    </button>
  );
}
