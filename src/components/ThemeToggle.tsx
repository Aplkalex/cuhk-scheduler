'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

const BUTTON_CLASSES =
  'p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors';
const ICON_CLASSES = 'w-5 h-5';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const effectiveTheme = (resolvedTheme ?? theme) as 'light' | 'dark' | 'system' | undefined;
  const currentTheme = effectiveTheme === 'dark' ? 'dark' : 'light';
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const label = `Switch to ${nextTheme} mode`;
  const icon = currentTheme === 'dark'
    ? <Sun className={`${ICON_CLASSES} text-yellow-500`} aria-hidden />
    : <Moon className={`${ICON_CLASSES} text-gray-700`} aria-hidden />;

  return (
    <button
      type="button"
      onClick={() => setTheme(nextTheme)}
      className={BUTTON_CLASSES}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
