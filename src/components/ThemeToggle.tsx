'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const BUTTON_CLASSES =
  'p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors';
const ICON_CLASSES = 'w-5 h-5';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Only render the actual theme toggle after mounting to avoid hydration mismatch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const effectiveTheme = (resolvedTheme ?? theme) as 'light' | 'dark' | 'system' | undefined;
  const currentTheme = effectiveTheme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const isDark = currentTheme === 'dark';
  const toggleLabel = nextTheme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode';

  // Render a placeholder button until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        type="button"
        className={BUTTON_CLASSES}
        disabled
        aria-label="Toggle theme"
      >
        <Sun className={`${ICON_CLASSES} text-yellow-500`} aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={BUTTON_CLASSES}
      title={toggleLabel}
      aria-label={toggleLabel}
    >
      {isDark ? (
        <Sun className={`${ICON_CLASSES} text-yellow-500`} aria-hidden />
      ) : (
        <Moon className={`${ICON_CLASSES} text-blue-200`} aria-hidden />
      )}
    </button>
  );
}
